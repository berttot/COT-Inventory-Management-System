/**
 * Audit log service: creates log entries without throwing.
 * Use this everywhere we record activity so that logging failures
 * never break login, password change, or other main flows.
 */
import AuditLog from "../models/AuditLog.js";
import { getWorldTime } from "./getWorldTime.js";

/**
 * @param {object} req - Express request (for ip, userAgent)
 * @param {object} payload - { userId?, name?, role?, action, details? }
 * @returns {Promise<object|null>} Created log or null on failure
 */
export async function recordAudit(req, payload) {
  if (!payload?.action) {
    console.warn("auditLogService: missing action, skipping");
    return null;
  }
  try {
    const timestamp = await getWorldTime();
    const log = await AuditLog.create({
      userId: payload.userId ?? null,
      name: payload.name ?? "System",
      role: payload.role ?? "unknown",
      action: payload.action,
      details: payload.details ?? "",
      timestamp,
      ipAddress: req?.ip ?? null,
      userAgent: req?.get?.("User-Agent") ?? null,
    });
    return log;
  } catch (err) {
    console.warn("auditLogService: failed to create log:", err.message);
    return null;
  }
}

/** Standard action types for dropdowns and filtering */
export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "CREATE_ACCOUNT",
  "INVITE_USER",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "PROFILE_UPDATED",
  "ARCHIVE_USER",
  "UNARCHIVE_USER",
];
