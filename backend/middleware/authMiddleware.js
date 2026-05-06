// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import { getArchivedUserMessage, isArchivedUser } from "../utils/authUtils.js";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid Authorization header" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (isArchivedUser(user)) {
      return res.status(403).json({ message: getArchivedUserMessage() });
    }

    req.user = user; // attach logged-in user to request
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Optional auth: attempts authentication but doesn't fail if missing
// Used for logout and other endpoints that should record events even during connection issues
export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      // No auth provided - continue without user context
      return next();
    }

    const token = header.split(" ")[1];
    if (!token) {
      // Invalid format - continue without user context
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && !isArchivedUser(user)) {
      req.user = user; // attach user if valid and not archived
    }
    // Always continue to next, even if user lookup fails
    next();
  } catch (err) {
    // Silent fail - any JWT or user lookup errors are ignored
    // Continue to next middleware/handler without user context
    next();
  }
};

// Only superadmin can access
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied: Superadmin only" });
  }
  next();
};
