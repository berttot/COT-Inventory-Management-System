// utils/socketService.js
import Item from "../models/ItemModel.js";

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
