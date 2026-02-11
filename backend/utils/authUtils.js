import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

/**
 * Extracts and validates the user from the Authorization header (Bearer token).
 * Returns the user object without password, or null if invalid/missing.
 */
export const getUserFromHeader = async (req) => {
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
