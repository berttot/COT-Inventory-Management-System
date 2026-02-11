import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import { sendEmail } from "../utils/email.js";
import { getUserFromHeader } from "../utils/authUtils.js";
import { recordAudit } from "../utils/auditLogService.js";
import asyncHandler from "../middleware/asyncHandler.js";

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

  const actorInfo = actor?.name ? ` Invitation sent by: ${actor.name} (${actor.role}).` : "";
  await recordAudit(req, {
    userId: actor?._id,
    name: actor?.name,
    role: actor?.role,
    action: "INVITE_USER",
    details: `Invitation email sent to ${email} for role: ${role}${department ? ` | Department: ${department}` : ""}. Registration link expires in 24 hours.${actorInfo}`,
  });

  res.json({ message: "Invitation sent successfully!" });
});

