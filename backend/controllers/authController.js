import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import User from "../models/UserModel.js";
import AuditLog from "../models/AuditLog.js";
import { getWorldTime } from "../utils/getWorldTime.js";
import asyncHandler from "../middleware/asyncHandler.js";

const verifyRecaptcha = async (token) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`;
    const response = await fetch(verifyURL, { method: "POST", signal: controller.signal });
    clearTimeout(timeout);
    return response.json();
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      return { success: false, timeout: true };
    }
    return { success: false, error: "Verification request failed" };
  }
};

export const login = asyncHandler(async (req, res) => {
  const { accessID, password, captchaToken } = req.body;

  const captchaData = await verifyRecaptcha(captchaToken);
  if (!captchaData.success) {
    const message = captchaData.timeout
      ? "reCAPTCHA request timed out. Please try again."
      : "reCAPTCHA verification failed. Please try again.";
    res.status(400);
    throw new Error(message);
  }

  const user = await User.findOne({ accessID });
  if (!user) {
    res.status(400);
    throw new Error("User does not exist");
  }

  if (!user.password) {
    res.status(400);
    throw new Error("This account has no password yet.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error("Invalid password");
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  try {
    await AuditLog.create({
      userId: user._id,
      name: user.name,
      role: user.role,
      action: "LOGIN",
      details: "Login successful",
      timestamp: await getWorldTime(),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });
  } catch (err) {
    console.warn("Failed to create login audit:", err.message);
  }

  res.json({
    message: "Login successful",
    token,
    _id: user._id,
    role: user.role,
    name: user.name,
    department: user.department,
    email: user.email,
    accessID: user.accessID,
  });
});

