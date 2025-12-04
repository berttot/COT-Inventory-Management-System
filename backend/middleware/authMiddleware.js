// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

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

    req.user = user; // attach logged-in user to request
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Only superadmin can access
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied: Superadmin only" });
  }
  next();
};
