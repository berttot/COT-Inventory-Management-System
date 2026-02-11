import Request from "../models/RequestModel.js";
import Item from "../models/ItemModel.js";
import {
  maybeCreateLowStockEvent,
  maybeCreateRestockEvent,
} from "../utils/stockAlerts.js";
import { emitStockAlerts } from "../utils/socketService.js";
import { getWorldTime } from "../utils/getWorldTime.js";
import asyncHandler from "../middleware/asyncHandler.js";

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

  if (item.quantity < quantity) {
    await Request.create({
      userId,
      itemId,
      itemName,
      department,
      requestedBy,
      quantity,
      status: "Unsuccessful",
    });

    res.status(400);
    throw new Error("Request Unsuccessful, Not enough stock available. Try again");
  }

  const currentTime = await getWorldTime();
  const newRequest = await Request.create({
    userId,
    itemId,
    itemName,
    department,
    requestedBy,
    quantity,
    status: "Successful",
    requestedAt: currentTime,
  });

  const prevQty = item.quantity;
  item.quantity -= quantity;
  await item.save();

  await maybeCreateLowStockEvent(item, prevQty, item.quantity);
  await maybeCreateRestockEvent(item, prevQty, item.quantity);
  await emitStockAlerts();

  res.status(201).json({
    message: "Request successful.",
    request: newRequest,
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
  const successful = await Request.countDocuments({ department, status: "Successful" });
  const unsuccessful = await Request.countDocuments({ department, status: "Unsuccessful" });

  res.json({ total, successful, unsuccessful });
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
  const successful = await Request.countDocuments({ userId, status: "Successful" });
  const unsuccessful = await Request.countDocuments({ userId, status: "Unsuccessful" });
  const total = successful + unsuccessful;

  res.json({ successful, unsuccessful, total });
});

