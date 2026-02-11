// server.js - COT Inventory System Backend
import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { initializeSocketService } from "./utils/socketService.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import inviteRoute from "./routes/inviteRoute.js";
import itemRoutes from "./routes/itemRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import superAdminReportRoutes from "./routes/superAdminReportRoutes.js";
import googleCalendarRoutes from "./routes/googleCalendarRoutes.js";
import logsRoutes from "./routes/logsRoutes.js";

// Configuration
dotenv.config();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Database connection
connectDB();

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/invite", inviteRoute);
app.use("/api/items", itemRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reports/superadmin", superAdminReportRoutes);
app.use("/api/calendar", googleCalendarRoutes);
app.use("/api/logs", logsRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// HTTP server with Socket.io for real-time notifications
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Initialize Socket.io service
initializeSocketService(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled (origin: ${FRONTEND_URL})`);
  console.log(`📊 MongoDB connected`);
});
