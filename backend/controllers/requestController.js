import Request from "../models/RequestModel.js";
import Item from "../models/ItemModel.js";
import {
  maybeCreateLowStockEvent,
  maybeCreateRestockEvent,
} from "../utils/stockAlerts.js";
import {
  emitRequestAlerts,
  emitRequestStatusUpdate,
  emitStockAlerts,
} from "../utils/socketService.js";
import { getWorldTime } from "../utils/getWorldTime.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { recordAudit } from "../utils/auditLogService.js";

const SUCCESS_STATUSES = ["Approved", "Successful"];
const UNSUCCESSFUL_STATUSES = ["Rejected", "Canceled", "Unsuccessful"];

const isPendingRequest = (status) => status === "Pending";

export const createRequest = asyncHandler(async (req, res) => {
  const { userId, itemId, itemName, department, requestedBy, quantity } = req.body;

  if (!itemId || !quantity || !userId) {
    res.status(400);
    throw new Error("User ID, Item ID, and quantity are required.");
  }

  const item = await Item.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found.");
  }

  const parsedQuantity = Number(quantity);
  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
    res.status(400);
    throw new Error("Please provide a valid quantity greater than zero.");
  }

  if (parsedQuantity > item.quantity) {
    res.status(400);
    throw new Error("Requested quantity exceeds current stock. Please enter a lower quantity.");
  }

  const currentTime = await getWorldTime();
  const newRequest = await Request.create({
    userId,
    itemId,
    itemName,
    department,
    requestedBy,
    quantity: parsedQuantity,
    status: "Pending",
    requestedAt: currentTime,
  });

  await recordAudit(req, {
    userId,
    name: requestedBy || "Staff",
    role: "staff",
    action: "REQUEST_SUBMITTED",
    details: `Submitted request ${newRequest._id} for ${parsedQuantity} x ${itemName || item.name} (${department || "Unknown"}).`,
  });

  await emitRequestAlerts();

  res.status(201).json({
    message: "Request submitted and pending superadmin approval.",
    request: newRequest,
  });
});

export const approveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestDoc = await Request.findById(id);

  if (!requestDoc) {
    res.status(404);
    throw new Error("Request not found.");
  }

  if (!isPendingRequest(requestDoc.status)) {
    res.status(409);
    throw new Error("Only pending requests can be approved.");
  }

  if (!requestDoc.itemId) {
    res.status(400);
    throw new Error("This request is missing an item reference and cannot be approved.");
  }

  const item = await Item.findById(requestDoc.itemId);
  if (!item) {
    requestDoc.status = "Rejected";
    requestDoc.rejectionReason = "Rejected automatically: item no longer exists.";
    requestDoc.rejectedAt = new Date();
    requestDoc.rejectedBy = req.user._id;
    await requestDoc.save();

    await recordAudit(req, {
      userId: req.user?._id,
      name: req.user?.name,
      role: req.user?.role,
      action: "REQUEST_AUTO_REJECTED",
      details: `Auto-rejected request ${requestDoc._id} because the item no longer exists.`,
    });

    await emitRequestAlerts();
    await emitRequestStatusUpdate({
      requestId: String(requestDoc._id),
      userId: String(requestDoc.userId),
      status: requestDoc.status,
      itemName: requestDoc.itemName,
      quantity: requestDoc.quantity,
      rejectionReason: requestDoc.rejectionReason || "",
      updatedAt: new Date().toISOString(),
    });

    res.status(409).json({
      message: "Request auto-rejected because the item no longer exists.",
      request: requestDoc,
    });
    return;
  }

  if (item.quantity < requestDoc.quantity) {
    requestDoc.status = "Rejected";
    requestDoc.rejectionReason = "Rejected automatically: insufficient stock at approval time.";
    requestDoc.rejectedAt = new Date();
    requestDoc.rejectedBy = req.user._id;
    await requestDoc.save();

    await recordAudit(req, {
      userId: req.user?._id,
      name: req.user?.name,
      role: req.user?.role,
      action: "REQUEST_AUTO_REJECTED",
      details: `Auto-rejected request ${requestDoc._id} due to insufficient stock at approval time (requested ${requestDoc.quantity}, available ${item.quantity}).`,
    });

    await emitRequestAlerts();
    await emitRequestStatusUpdate({
      requestId: String(requestDoc._id),
      userId: String(requestDoc.userId),
      status: requestDoc.status,
      itemName: requestDoc.itemName,
      quantity: requestDoc.quantity,
      rejectionReason: requestDoc.rejectionReason || "",
      updatedAt: new Date().toISOString(),
    });

    res.status(409).json({
      message: "Request auto-rejected due to insufficient stock at approval time.",
      request: requestDoc,
    });
    return;
  }

  const prevQty = item.quantity;
  item.quantity -= requestDoc.quantity;
  await item.save();

  requestDoc.status = "Approved";
  requestDoc.approvedAt = new Date();
  requestDoc.approvedBy = req.user._id;
  requestDoc.rejectionReason = "";
  await requestDoc.save();

  await recordAudit(req, {
    userId: req.user?._id,
    name: req.user?.name,
    role: req.user?.role,
    action: "REQUEST_APPROVED",
    details: `Approved request ${requestDoc._id} for ${requestDoc.quantity} x ${requestDoc.itemName}. Stock moved ${prevQty} -> ${item.quantity}.`,
  });

  await emitRequestAlerts();
  await emitRequestStatusUpdate({
    requestId: String(requestDoc._id),
    userId: String(requestDoc.userId),
    status: requestDoc.status,
    itemName: requestDoc.itemName,
    quantity: requestDoc.quantity,
    rejectionReason: "",
    updatedAt: new Date().toISOString(),
  });

  await maybeCreateLowStockEvent(item, prevQty, item.quantity);
  await maybeCreateRestockEvent(item, prevQty, item.quantity);
  await emitStockAlerts();

  res.json({
    message: "Request approved and stock deducted successfully.",
    request: requestDoc,
  });
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const requestDoc = await Request.findById(id);

  if (!requestDoc) {
    res.status(404);
    throw new Error("Request not found.");
  }

  if (!isPendingRequest(requestDoc.status)) {
    res.status(409);
    throw new Error("Only pending requests can be rejected.");
  }

  requestDoc.status = "Rejected";
  requestDoc.rejectedAt = new Date();
  requestDoc.rejectedBy = req.user._id;
  requestDoc.rejectionReason = (reason || "Rejected by superadmin.").toString().trim();
  await requestDoc.save();

  await recordAudit(req, {
    userId: req.user?._id,
    name: req.user?.name,
    role: req.user?.role,
    action: "REQUEST_REJECTED",
    details: `Rejected request ${requestDoc._id} for ${requestDoc.quantity} x ${requestDoc.itemName}. Reason: ${requestDoc.rejectionReason}`,
  });

  await emitRequestAlerts();
  await emitRequestStatusUpdate({
    requestId: String(requestDoc._id),
    userId: String(requestDoc.userId),
    status: requestDoc.status,
    itemName: requestDoc.itemName,
    quantity: requestDoc.quantity,
    rejectionReason: requestDoc.rejectionReason || "",
    updatedAt: new Date().toISOString(),
  });

  res.json({
    message: "Request rejected successfully.",
    request: requestDoc,
  });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestDoc = await Request.findById(id);

  if (!requestDoc) {
    res.status(404);
    throw new Error("Request not found.");
  }

  if (!isPendingRequest(requestDoc.status)) {
    res.status(409);
    throw new Error("Only pending requests can be canceled.");
  }

  if (String(requestDoc.userId) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You can only cancel your own pending requests.");
  }

  requestDoc.status = "Canceled";
  requestDoc.canceledAt = new Date();
  requestDoc.canceledBy = req.user._id;
  await requestDoc.save();

  await recordAudit(req, {
    userId: req.user?._id,
    name: req.user?.name,
    role: req.user?.role,
    action: "REQUEST_CANCELED",
    details: `Canceled pending request ${requestDoc._id} for ${requestDoc.quantity} x ${requestDoc.itemName}.`,
  });

  await emitRequestAlerts();
  await emitRequestStatusUpdate({
    requestId: String(requestDoc._id),
    userId: String(requestDoc.userId),
    status: requestDoc.status,
    itemName: requestDoc.itemName,
    quantity: requestDoc.quantity,
    rejectionReason: "",
    updatedAt: new Date().toISOString(),
  });

  res.json({
    message: "Pending request canceled successfully.",
    request: requestDoc,
  });
});

export const getStaffRequests = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const requests = await Request.find({ userId }).sort({ createdAt: -1 });
  res.json(requests);
});

export const getDepartmentRequests = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { month, year, day } = req.query;
  const query = { department };

  if (year && month && day) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    const d = parseInt(day, 10);
    query.requestedAt = {
      $gte: new Date(y, m, d, 0, 0, 0),
      $lte: new Date(y, m, d, 23, 59, 59),
    };
  } else if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    query.requestedAt = {
      $gte: new Date(y, m, 1),
      $lt: new Date(y, m + 1, 1),
    };
  }

  const requests = await Request.find(query).sort({ requestedAt: -1 });
  res.json(requests);
});

export const getDepartmentStats = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const total = await Request.countDocuments({ department });
  const successful = await Request.countDocuments({ department, status: { $in: SUCCESS_STATUSES } });
  const unsuccessful = await Request.countDocuments({
    department,
    status: { $in: UNSUCCESSFUL_STATUSES },
  });
  const pending = await Request.countDocuments({ department, status: "Pending" });

  res.json({ total, successful, unsuccessful, pending });
});

export const getAllDepartmentRequests = asyncHandler(async (req, res) => {
  const { month, year, day } = req.query;
  const query = {};

  if (year && month && day) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    const d = parseInt(day, 10);
    query.requestedAt = {
      $gte: new Date(y, m, d, 0, 0, 0),
      $lte: new Date(y, m, d, 23, 59, 59),
    };
  } else if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10) - 1;
    query.requestedAt = {
      $gte: new Date(y, m, 1),
      $lt: new Date(y, m + 1, 1),
    };
  }

  const requests = await Request.find(query).sort({ requestedAt: -1 });
  const grouped = {};

  requests.forEach((request) => {
    if (!grouped[request.department]) {
      grouped[request.department] = [];
    }
    grouped[request.department].push(request);
  });

  res.json(grouped);
});

export const getSummary = asyncHandler(async (req, res) => {
  const totalRequests = await Request.countDocuments();
  const totalItems = await Item.countDocuments();
  const outOfStock = await Item.countDocuments({ quantity: { $lte: 0 } });

  res.json({ totalRequests, totalItems, outOfStock });
});

export const getPendingRequestAlertCount = asyncHandler(async (req, res) => {
  const pending = await Request.countDocuments({ status: "Pending" });
  res.json({ success: true, pending });
});

export const getPendingRequestAlertSummary = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const pendingRequests = await Request.find({ status: "Pending" })
    .sort({ requestedAt: -1, createdAt: -1 })
    .limit(limit)
    .select("itemName quantity department requestedBy requestedAt")
    .lean();

  res.json({ success: true, pending: pendingRequests.length, pendingRequests });
});

export const getRequestTrends = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();

  let startDate;
  let endDate;

  if (month) {
    const m = parseInt(month, 10) - 1;
    startDate = new Date(targetYear, m, 1);
    endDate = new Date(targetYear, m + 1, 0, 23, 59, 59);
  } else {
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
  }

  const pipeline = [
    { $match: { requestedAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: month
        ? { _id: { day: { $dayOfMonth: "$requestedAt" } }, totalRequests: { $sum: 1 } }
        : { _id: { month: { $month: "$requestedAt" } }, totalRequests: { $sum: 1 } },
    },
    { $sort: { "_id.month": 1, "_id.day": 1 } },
  ];

  const results = await Request.aggregate(pipeline);

  if (month) {
    const daysInMonth = new Date(targetYear, parseInt(month, 10), 0).getDate();
    const formatted = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const found = results.find((r) => r._id.day === day);
      return { day, requests: found ? found.totalRequests : 0 };
    });
    res.json(formatted);
    return;
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const formatted = months.map((label, idx) => {
    const found = results.find((r) => r._id.month === idx + 1);
    return { month: label, requests: found ? found.totalRequests : 0 };
  });

  res.json(formatted);
});

export const getDepartmentActivity = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();

  let startDate;
  let endDate;
  if (month) {
    const m = parseInt(month, 10) - 1;
    startDate = new Date(targetYear, m, 1);
    endDate = new Date(targetYear, m + 1, 0, 23, 59, 59);
  } else {
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59);
  }

  const pipeline = [
    { $match: { requestedAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$department",
        requests: { $sum: 1 },
      },
    },
    { $sort: { requests: -1 } },
  ];

  const results = await Request.aggregate(pipeline);
  const formatted = results.map((result) => ({
    department: result._id || "Unknown",
    requests: result.requests,
  }));

  res.json(formatted);
});

export const getStaffSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const successful = await Request.countDocuments({ userId, status: { $in: SUCCESS_STATUSES } });
  const unsuccessful = await Request.countDocuments({ userId, status: { $in: UNSUCCESSFUL_STATUSES } });
  const pending = await Request.countDocuments({ userId, status: "Pending" });
  const total = successful + unsuccessful + pending;

  res.json({ successful, unsuccessful, pending, total });
});

