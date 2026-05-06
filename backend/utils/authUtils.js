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
    return await User.findById(decoded.id).select("-password");
  } catch {
    return null;
  }
};

/**
 * Extracts and validates a user directly from a raw JWT token.
 * Returns user without password or null if invalid.
 */
export const getUserFromToken = async (token) => {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-password");
  } catch {
    return null;
  }
};

export const isArchivedUser = (user) => Boolean(user?.isArchived);

export const getArchivedUserMessage = () =>
  "This account has been archived. Please contact an administrator.";
