import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import AuditLog from "../models/AuditLog.js";
import { sendEmail } from "../utils/email.js";
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

export const sendInvite = asyncHandler(async (req, res) => {
  const actor = await getUserFromHeader(req);
  const { email, role, department } = req.body;

  if (!email || !role) {
    res.status(400);
    throw new Error("Email and role are required.");
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error("Email already exists in the system.");
  }

  const token = jwt.sign(
    { email, role, department },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  const inviteLink = `http://localhost:3000/register?token=${token}`;

  const html = `
    <h3>Hello!</h3>
    <p>You’ve been invited to join the <strong>COT Inventory System</strong> as a <strong>${role}</strong>.</p>
    ${department ? `<p>This invitation is for the <strong>${department}</strong> Department.</p>` : ""}
    <p>
      Click the link below to complete your registration:<br/><br/>
      <a href="${inviteLink}" style="color:#2563eb;font-weight:bold;">Create Account</a>
    </p>
    <p>This link expires in 24 hours.</p>
    <br/>
    <p>Thank you,<br/>COT Inventory System</p>
  `;

  await sendEmail({
    to: email,
    subject: "You’re Invited to Join COT Inventory System",
    html,
  });

  await AuditLog.create({
    userId: actor?._id,
    name: actor?.name,
    role: actor?.role,
    action: "INVITE_USER",
    details: `Invited ${email} as ${role}${department ? ` (Department: ${department})` : ""}`,
    timestamp: await getWorldTime(),
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.json({ message: "Invitation sent successfully!" });
});

