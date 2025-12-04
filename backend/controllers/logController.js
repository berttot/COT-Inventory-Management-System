import jwt from "jsonwebtoken";
import AuditLog from "../models/AuditLog.js";
import User from "../models/UserModel.js";
import { getWorldTime } from "../utils/getWorldTime.js";
import asyncHandler from "../middleware/asyncHandler.js";

const getUserFromHeader = async (req) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const token = auth.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return User.findById(decoded.id).select("-password");
  } catch {
    return null;
  }
};

export const createLog = asyncHandler(async (req, res) => {
  const caller = await getUserFromHeader(req);
  const { userId, name, role, action, details } = req.body;

  const log = await AuditLog.create({
    userId: userId || caller?._id,
    name: name || caller?.name,
    role: role || caller?.role,
    action,
    details,
    timestamp: await getWorldTime(),
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(201).json(log);
});

export const createLogoutLog = asyncHandler(async (req, res) => {
  const caller = await getUserFromHeader(req);
  const name = caller?.name || req.body.name || "Unknown";
  const role = caller?.role || req.body.role || "unknown";
  const userId = caller?._id || req.body.userId;

  const log = await AuditLog.create({
    userId,
    name,
    role,
    action: "LOGOUT",
    details: req.body.details || "User logged out",
    timestamp: await getWorldTime(),
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.json({ message: "Logout recorded", log });
});

export const getLogs = asyncHandler(async (req, res) => {
  const { userId, role, action, from, to, page = 1, limit = 50 } = req.query;
  const query = {};

  if (userId) query.userId = userId;
  if (role) query.role = role;
  if (action) query.action = action;

  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json({ total, page: Number(page), limit: Number(limit), logs });
});

