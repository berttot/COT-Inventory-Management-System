import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import { recordAudit } from "../utils/auditLogService.js";
import { sendEmail } from "../utils/email.js";
import { getUserFromHeader } from "../utils/authUtils.js";
import asyncHandler from "../middleware/asyncHandler.js";

const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const isStrongPassword = (password) => strongRegex.test(password);

let sseClients = [];

const broadcastLockUpdate = (data) => {
  sseClients.forEach((client) => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
};

export const getUserCount = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({ role: { $ne: "superadmin" } });
  res.json({ total: totalUsers });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { archived } = req.query;
  const filter = {};
  if (archived === "true") filter.isArchived = true;
  if (archived === "false") filter.isArchived = false;

  const users = await User.find(filter).select("-password");
  res.json(users);
});

export const createUser = asyncHandler(async (req, res) => {
  const { accessID, name, email, role, department, password } = req.body;

  if (!email || !password || !accessID || !name || !role || !department) {
    res.status(400);
    throw new Error("All fields are required");
  }

  if (!isStrongPassword(password)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character."
    );
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already exists");
  }

  const existingAccess = await User.findOne({ accessID });
  if (existingAccess) {
    res.status(400);
    throw new Error("Access ID already exists");
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await User.create({
    accessID,
    name,
    email,
    role,
    department,
    password: hashedPassword,
  });

  await recordAudit(req, {
    userId: newUser._id,
    name: newUser.name,
    role: newUser.role,
    action: "CREATE_ACCOUNT",
    details: `New account created. Name: ${newUser.name} | Email: ${newUser.email} | Role: ${newUser.role} | Department: ${newUser.department} | AccessID: ${newUser.accessID}. Welcome email sent to user.`,
  });

  await sendEmail({
    to: email,
    subject: "Your COT Inventory System Account",
    html: `
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account has been successfully created as a <strong>${role}</strong>.</p>
      <p>You can now log in at: 
        <a href="http://localhost:3000" target="_blank" style="color:#2563eb;">COT Inventory System Login</a>
      </p>
      <p>Thank you,<br/>COT Inventory System</p>
    `,
  });

  res.status(201).json({
    message: "User created successfully!",
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401);
    throw new Error("Incorrect current password");
  }

  const hashedNew = await bcrypt.hash(newPassword, 10);
  user.password = hashedNew;
  await user.save();

  await recordAudit(req, {
    userId: user._id,
    name: user.name,
    role: user.role,
    action: "PASSWORD_CHANGED",
    details: `Password was changed from Account Settings. User: ${user.name} | Email: ${user.email} | Role: ${user.role}.`,
  });

  res.json({ message: "Password updated successfully" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400);
    throw new Error("Missing token or password.");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      res.status(400);
      throw new Error("Reset link expired. Please request a new one.");
    }
    res.status(400);
    throw new Error("Invalid or expired token.");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
  user.password = await bcrypt.hash(newPassword, saltRounds);
  await user.save();

  await recordAudit(req, {
    userId: user._id,
    name: user.name,
    role: user.role,
    action: "PASSWORD_RESET",
    details: `Password was reset using the email reset link. User: ${user.name} | Email: ${user.email} | Role: ${user.role}. New password set successfully.`,
  });

  res.json({ message: "Password reset successfully! You can now log in with your new password." });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  if (updates.password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    updates.password = await bcrypt.hash(updates.password, saltRounds);
  } else {
    delete updates.password;
  }

  const updated = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updated) {
    res.status(404);
    throw new Error("User not found");
  }

  const actor = await getUserFromHeader(req);
  const changedFields = Object.keys(updates).filter((k) => k !== "password").join(", ") || "profile";
  const actorInfo = actor?.name ? ` Edited by: ${actor.name} (${actor.role}).` : "";
  await recordAudit(req, {
    userId: actor?._id,
    name: actor?.name,
    role: actor?.role,
    action: "PROFILE_UPDATED",
    details: `Profile/account was edited. Target user: ${updated.name} | AccessID: ${updated.accessID} | Role: ${updated.role} | Department: ${updated.department || "—"}. Changed fields: ${changedFields}.${actorInfo}`,
  });

  res.json(updated);
});

export const archiveUser = asyncHandler(async (req, res) => {
  const actor = await getUserFromHeader(req);
  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404);
    throw new Error("User not found");
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { isArchived: true, lockedBy: null, lockExpiresAt: null },
    { new: true }
  );

  broadcastLockUpdate({ type: "unlock", userId: updated._id });

  const actorInfo = actor?.name ? ` Archived by: ${actor.name} (${actor.role}).` : "";
  await recordAudit(req, {
    userId: actor?._id,
    name: actor?.name,
    role: actor?.role,
    action: "ARCHIVE_USER",
    details: `User account was archived (deactivated). User: ${target.name} | AccessID: ${target.accessID} | Role: ${target.role} | Department: ${target.department || "—"}. User can be restored later.${actorInfo}`,
  });

  res.json({ message: "User archived successfully" });
});

export const unarchiveUser = asyncHandler(async (req, res) => {
  const actor = await getUserFromHeader(req);
  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404);
    throw new Error("User not found");
  }

  await User.findByIdAndUpdate(
    req.params.id,
    { isArchived: false },
    { new: true }
  );

  const actorInfo = actor?.name ? ` Restored by: ${actor.name} (${actor.role}).` : "";
  await recordAudit(req, {
    userId: actor?._id,
    name: actor?.name,
    role: actor?.role,
    action: "UNARCHIVE_USER",
    details: `User account was restored from archive. User: ${target.name} | AccessID: ${target.accessID} | Role: ${target.role} | Department: ${target.department || "—"}.${actorInfo}`,
  });

  res.json({ message: "User restored successfully" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("Email not found");
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "COT Inventory System - Reset Your Password",
    html: `
      <h3>Password Reset</h3>
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Click below to reset your password:</p>
      <p><a href="${resetLink}" target="_blank" style="color:#2563eb;">Reset Password</a></p>
      <p>This link expires in 15 minutes.</p>
    `,
  });

  res.json({ message: "Reset link sent to your email." });
});

export const lockUser = asyncHandler(async (req, res) => {
  const adminName = req.body.adminName;
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const now = new Date();

  if (user.lockExpiresAt && user.lockExpiresAt < now) {
    user.lockedBy = null;
    user.lockExpiresAt = null;
    await user.save();
  }

  if (user.lockedBy && user.lockedBy !== adminName) {
    res.status(423);
    throw new Error(`This user is currently being edited by ${user.lockedBy}`);
  }

  user.lockedBy = adminName;
  user.lockExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  await user.save();

  broadcastLockUpdate({
    type: "lock",
    userId: user._id,
    lockedBy: adminName,
    expiresAt: user.lockExpiresAt,
  });

  res.json({ message: "Lock acquired", user });
});

export const unlockUser = asyncHandler(async (req, res) => {
  const adminName = req.body.adminName;
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.lockedBy !== adminName) {
    res.status(403);
    throw new Error("You do not own this lock");
  }

  user.lockedBy = null;
  user.lockExpiresAt = null;
  await user.save();

  broadcastLockUpdate({
    type: "unlock",
    userId: user._id,
  });

  res.json({ message: "User unlocked" });
});

export const streamUserLocks = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = { id: Date.now(), res };
  sseClients.push(client);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c.id !== client.id);
  });
};

