// utils/socketService.js
import Item from "../models/ItemModel.js";
import Request from "../models/RequestModel.js";

let io = null;

/**
 * Initialize Socket.io service
 * @param {object} socketServer - Socket.io server instance
 */
export const initializeSocketService = (socketServer) => {
  io = socketServer;

  if (!io) {
    console.error("❌ Socket.io initialization failed");
    return;
  }

  io.on("connection", (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Push latest pending-request count on connect for superadmin bell freshness.
    emitRequestAlerts();

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log("📡 Socket.io service initialized");
};

/**
 * Broadcast real-time stock alert updates to all connected clients
 * Triggered on inventory changes: create, update, restock, archive, unarchive, request
 */
export const emitStockAlerts = async () => {
  if (!io) {
    console.warn("⚠️ Socket.io not initialized, skipping alert broadcast");
    return;
  }

  try {
    // Query items that are low stock (1-10) or out of stock (0)
    const alertQuery = {
      isArchived: false,
      $or: [
        { quantity: { $lte: 0 } },         // Out of stock
        { quantity: { $gte: 1, $lte: 10 } }, // Low stock
      ],
    };

    const items = await Item.find(alertQuery).select("quantity").lean();

    let outOfStock = 0;
    let lowStock = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) outOfStock++;
      else if (qty <= 10) lowStock++;
    });

    const payload = {
      outOfStock,
      lowStock,
      total: outOfStock + lowStock,
    };

    // Broadcast to all connected clients
    io.emit("stock-alerts", payload);
    console.log(`📤 Stock alerts broadcasted: ${payload.total} total alerts`);
  } catch (error) {
    console.error("❌ Error broadcasting stock alerts:", error.message);
  }
};

/**
 * Broadcast real-time pending request updates to all connected clients.
 * Superadmin UI consumes this for request notifications.
 */
export const emitRequestAlerts = async () => {
  if (!io) {
    console.warn("⚠️ Socket.io not initialized, skipping request alert broadcast");
    return;
  }

  try {
    const pendingCount = await Request.countDocuments({ status: "Pending" });
    const latestPending = await Request.find({ status: "Pending" })
      .sort({ requestedAt: -1, createdAt: -1 })
      .limit(5)
      .select("itemName quantity department requestedBy requestedAt")
      .lean();

    const payload = {
      pending: pendingCount,
      latestPending,
    };

    io.emit("request-alerts", payload);
    console.log(`📤 Request alerts broadcasted: ${payload.pending} pending`);
  } catch (error) {
    console.error("❌ Error broadcasting request alerts:", error.message);
  }
};

/**
 * Broadcast request status updates so staff can receive real-time decisions.
 * Payload fields: { requestId, userId, status, itemName, quantity, rejectionReason, updatedAt }
 */
export const emitRequestStatusUpdate = async (payload) => {
  if (!io) {
    console.warn("⚠️ Socket.io not initialized, skipping request status broadcast");
    return;
  }

  try {
    io.emit("request-status-updated", payload);
    console.log(`📤 Request status update broadcasted: ${payload?.requestId || "unknown"}`);
  } catch (error) {
    console.error("❌ Error broadcasting request status update:", error.message);
  }
};
