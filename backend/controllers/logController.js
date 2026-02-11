import fs from "fs";
import path from "path";
import crypto from "crypto";
import QRCode from "qrcode";
import AuditLog from "../models/AuditLog.js";
import { getUserFromHeader } from "../utils/authUtils.js";
import { recordAudit } from "../utils/auditLogService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import PdfPrinter from "pdfmake";
import { generateSignatureImage } from "../utils/signatureUtils.js";

const printer = new PdfPrinter({
  Arial: {
    normal: "./fonts/arial.ttf",
    bold: "./fonts/arialbd.ttf",
    italics: "./fonts/arial.ttf",
    bolditalics: "./fonts/arialbd.ttf",
  },
});

const logoPath = path.resolve("./image/buksulogo.png");

export const createLog = asyncHandler(async (req, res) => {
  const caller = (await getUserFromHeader(req)) || req.user;
  const { action, details } = req.body;

  const log = await recordAudit(req, {
    userId: caller?._id,
    name: caller?.name,
    role: caller?.role,
    action,
    details: details ?? "",
  });

  res.status(201).json(log || { message: "Log recorded" });
});

export const createLogoutLog = asyncHandler(async (req, res) => {
  const caller = (await getUserFromHeader(req)) || req.user;
  const name = caller?.name || "Unknown";
  const role = caller?.role || "unknown";
  const userId = caller?._id;

  const customNote = req.body.details ? ` (${req.body.details})` : "";
  const log = await recordAudit(req, {
    userId,
    name,
    role,
    action: "LOGOUT",
    details: `Signed out from the system. Session ended.${customNote}`,
  });

  res.json({ message: "Logout recorded", log });
});

export const getLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    role,
    action,
    from,
    to,
    excludeSuperAdmin,
    page = 1,
    limit = 50,
  } = req.query;
  const query = {};

  if (userId) query.userId = userId;
  if (role) query.role = role;
  else if (String(excludeSuperAdmin).toLowerCase() === "true") {
    query.role = { $ne: "superadmin" };
  }
  if (action) query.action = action;

  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json({ total, page: Number(page), limit: Number(limit), logs });
});

export const getLogsPdf = asyncHandler(async (req, res) => {
  const {
    role,
    action,
    from,
    to,
    excludeSuperAdmin,
    limit: limitParam = 500,
  } = req.query;
  const query = {};
  if (role) query.role = role;
  else if (String(excludeSuperAdmin).toLowerCase() === "true") {
    query.role = { $ne: "superadmin" };
  }
  if (action) query.action = action;
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }
  const limit = Math.min(Number(limitParam) || 500, 1000);
  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

  let inclusiveDatesText = "Inclusive Dates: All records";

  if (from || to) {
    const startLabel = from ? formatDate(from) : "N/A";
    const endLabel = to ? formatDate(to) : "N/A";
    inclusiveDatesText = `Inclusive Dates: ${startLabel} - ${endLabel}`;
  } else if (logs.length > 0) {
    const latest = logs[0].timestamp;
    const earliest = logs[logs.length - 1].timestamp;
    inclusiveDatesText = `Inclusive Dates: ${formatDate(earliest)} - ${formatDate(
      latest
    )}`;
  }

  const tableBody = [
    [
      { text: "Time", bold: true },
      { text: "User", bold: true },
      { text: "Role", bold: true },
      { text: "Action", bold: true },
      { text: "Details", bold: true },
      { text: "IP", bold: true },
    ],
  ];
  logs.forEach((log) => {
    tableBody.push([
      new Date(log.timestamp).toLocaleString("en-PH"),
      log.name || log.userId?.toString() || "—",
      log.role || "—",
      log.action || "—",
      (log.details || "—").substring(0, 120),
      log.ipAddress || "—",
    ]);
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const generatedLabel = now.toLocaleString("en-PH");

  const preparedByName = req.user?.name || "Super Admin";
  const preparedBySignature = generateSignatureImage(preparedByName);

  const uniqueUsers = new Set(
    logs.map((l) => l.userId?.toString() || l.name).filter(Boolean)
  );
  const roleCounts = {};
  const actionCounts = {};
  logs.forEach((l) => {
    const r = l.role || "unknown";
    const a = l.action || "UNKNOWN";
    roleCounts[r] = (roleCounts[r] || 0) + 1;
    actionCounts[a] = (actionCounts[a] || 0) + 1;
  });

  const topRoles = Object.entries(roleCounts)
    .map(([r, c]) => ({ role: r, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topActions = Object.entries(actionCounts)
    .map(([a, c]) => ({ action: a, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // --- Scannable verification (QR + SHA-256 hash) ---
  const fingerprintLines = logs.map((l) => {
    const id = String(l._id || "");
    const ts = new Date(l.timestamp || 0).toISOString();
    const user = String(l.userId || "");
    const name = String(l.name || "");
    const role = String(l.role || "");
    const action = String(l.action || "");
    const details = String(l.details || "");
    const ip = String(l.ipAddress || "");
    return `${id}|${ts}|${user}|${name}|${role}|${action}|${details}|${ip}`;
  });
  const verificationHash = crypto
    .createHash("sha256")
    .update(fingerprintLines.join("\n"))
    .digest("hex");

  const qrPayload = {
    system: "COT Inventory System",
    reportType: "System Activity Log Report",
    filters: {
      role: role || null,
      action: action || null,
      from: from || null,
      to: to || null,
      excludeSuperAdmin: String(excludeSuperAdmin).toLowerCase() === "true",
      limit,
    },
    totals: {
      records: logs.length,
      uniqueUsers: uniqueUsers.size,
    },
    generatedAt: now.toISOString(),
    generatedBy: preparedByName,
    sha256: verificationHash,
  };

  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: {
        dark: "#0a2a66",
        light: "#00000000",
      },
    });
  } catch (e) {
    console.warn("QR generation failed:", e?.message || e);
  }

  const summaryTableBody = [
    [{ text: "Metric", bold: true }, { text: "Value", bold: true }],
    ["Inclusive dates", inclusiveDatesText.replace("Inclusive Dates: ", "")],
    ["Total records", String(logs.length)],
    ["Unique users", String(uniqueUsers.size)],
    ["Role filter", role || (String(excludeSuperAdmin).toLowerCase() === "true" ? "All (excluding Super Admin)" : "All roles")],
    ["Action filter", action || "All actions"],
  ];

  const rolesTableBody = [
    [{ text: "Top roles", bold: true }, { text: "Count", bold: true }],
    ...(topRoles.length ? topRoles.map((r) => [r.role, String(r.count)]) : [["—", "0"]]),
  ];

  const actionsTableBody = [
    [{ text: "Top actions", bold: true }, { text: "Count", bold: true }],
    ...(topActions.length
      ? topActions.map((a) => [a.action, String(a.count)])
      : [["—", "0"]]),
  ];

  const docDefinition = {
    pageOrientation: "landscape",
    pageMargins: [40, 80, 40, 60],
    header: (currentPage, pageCount) => ({
      columns: [
        {
          text: "COT Inventory System",
          fontSize: 9,
          bold: true,
          color: "#0a2a66",
        },
        {
          text: "System Activity Log Report",
          fontSize: 9,
          bold: true,
          alignment: "center",
          color: "#0a2a66",
        },
        {
          text: currentPage === 1 ? generatedLabel : `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          alignment: "right",
          color: "#666",
        },
      ],
      margin: [40, 20, 40, 10],
    }),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "For internal use only. College of Technology.", fontSize: 7, color: "#888" },
        { text: `Page ${currentPage} of ${pageCount}`, fontSize: 8, alignment: "center", color: "#666" },
        { text: `Total records: ${logs.length}`, fontSize: 7, alignment: "right", color: "#888" },
      ],
      margin: [40, 8, 40, 15],
    }),
    content: [
      {
        columns: [
          { image: logoPath, width: 60 },
          {
            stack: [
              {
                text: "BUKIDNON STATE UNIVERSITY",
                bold: true,
                fontSize: 13,
                alignment: "center",
              },
              { text: "College of Technology", alignment: "center" },
              { text: "Malaybalay City, Bukidnon 8700", alignment: "center" },
              {
                text: "Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph",
                fontSize: 9,
                alignment: "center",
              },
            ],
          },
        ],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: `\n${inclusiveDatesText}`, alignment: "left" },
              {
                text: `Generated: ${generatedLabel} | Total records: ${logs.length}`,
                alignment: "left",
                fontSize: 10,
                color: "#555",
                margin: [0, 2, 0, 0],
              },
              {
                text: `Verification Hash: ${verificationHash.slice(0, 16).toUpperCase()}`,
                fontSize: 9,
                color: "#333",
                margin: [0, 6, 0, 0],
              },
              {
                text: "Scan the QR code to view full verification payload.",
                fontSize: 8,
                color: "#555",
                margin: [0, 2, 0, 0],
              },
            ],
          },
          {
            width: 140,
            stack: [
              ...(qrDataUrl ? [{ image: qrDataUrl, width: 120, alignment: "right", margin: [0, 0, 0, 0] }] : []),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: summaryTableBody },
            layout: "lightHorizontalLines",
          },
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: rolesTableBody },
            layout: "lightHorizontalLines",
          },
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: actionsTableBody },
            layout: "lightHorizontalLines",
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [120, 110, 90, 120, "*", 110],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
      { text: "", pageBreak: "after" },
      { text: "\nRemarks (optional):", bold: true, margin: [0, 10, 0, 8] },
      { text: "_____________________________________________________________\n".repeat(4), margin: [0, 0, 0, 35] },
      {
        stack: [
          { text: "Prepared by:", bold: true, margin: [0, 0, 0, 12] },
          ...(preparedBySignature ? [{ image: preparedBySignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: preparedByName, alignment: "left", margin: [0, 0, 0, 5] },
          { text: "Super Admin - College of Technology", fontSize: 9, alignment: "left" },
        ],
      },
    ],
    defaultStyle: { font: "Arial", fontSize: 9 },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const reportsDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const fileName = `SystemLogs_${dateStr}_${Date.now()}.pdf`;
  const filePath = path.join(reportsDir, fileName);
  const stream = fs.createWriteStream(filePath);

  pdfDoc.pipe(stream);
  pdfDoc.on("error", (err) => {
    console.error("PDF generation error:", err);
    stream.destroy();
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
    if (!res.headersSent) res.status(500).json({ message: "Failed to generate PDF" });
  });
  stream.on("error", (err) => {
    console.error("Stream error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Failed to write PDF" });
  });
  stream.on("finish", () => {
    if (!res.headersSent) {
      res.download(filePath, fileName, (err) => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
        if (err && !res.headersSent) res.status(500).json({ message: "Download failed" });
      });
    }
  });
  pdfDoc.end();
});

