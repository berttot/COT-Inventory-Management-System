import mongoose from "mongoose";

const auditSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: false },
  role: { type: String, required: false },
  action: { type: String, required: true }, // LOGIN|LOGOUT|CREATE_USER|ARCHIVE_USER|RESTOCK_ITEM etc.
  details: { type: String, default: "" },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

const AuditLog = mongoose.model("AuditLog", auditSchema);
export default AuditLog;
