import fs from "fs";
import path from "path";
import crypto from "crypto";
import QRCode from "qrcode";
import PdfPrinter from "pdfmake";
import Request from "../models/RequestModel.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { generateSignatureImage } from "../utils/signatureUtils.js";

const printer = new PdfPrinter({
  Arial: {
    normal: "./fonts/arial.ttf",
    bold: "./fonts/arialbd.ttf",
    italics: "./fonts/arial.ttf",
    bolditalics: "./fonts/arialbd.ttf",
  },
});

const getDateRange = (month, year) => {
  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();
  const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();

  return {
    start: new Date(targetYear, targetMonth, 1),
    end: new Date(targetYear, targetMonth + 1, 0, 23, 59, 59),
    targetYear,
    targetMonth,
  };
};

const logoPath = path.resolve("./image/buksulogo.png");
const COMPLETED_STATUSES = ["Successful", "Approved"];
const APPROVED_STATUSES = ["Approved", "Successful"];
const REJECTED_STATUSES = ["Rejected", "Unsuccessful"];
const CANCELED_STATUSES = ["Canceled"];

const normalizeRequestStatus = (status) => {
  if (APPROVED_STATUSES.includes(status)) return "Approved";
  if (REJECTED_STATUSES.includes(status)) return "Rejected";
  if (CANCELED_STATUSES.includes(status)) return "Canceled";
  if (status === "Pending") return "Pending";
  return status || "Unknown";
};

export const generateCombinedReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const { start, end, targetYear, targetMonth } = getDateRange(month, year);

  const requests = await Request.find({
    requestedAt: { $gte: start, $lte: end },
  }).sort({ requestedAt: 1 });

  if (requests.length === 0) {
    res.status(404);
    throw new Error("No data found for this period.");
  }

  // In inventory systems, a "transaction" typically refers to a completed/posted movement.
  // For this report, we treat ONLY successful requests (stock issuance) as transactions.
  const transactions = requests.filter((r) => COMPLETED_STATUSES.includes(r.status));

  if (transactions.length === 0) {
    res.status(404);
    throw new Error("No completed transactions found for this period.");
  }

  const totalTransactions = transactions.length;

  const totalQtyIssued = transactions.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0
  );

  // --- Scannable verification (QR + SHA-256 hash) ---
  // Hash is computed from a deterministic fingerprint of the transactions list.
  const fingerprintLines = transactions.map((r) => {
    const id = String(r._id || "");
    const ts = new Date(r.requestedAt || r.createdAt || 0).toISOString();
    const dept = String(r.department || "");
    const by = String(r.requestedBy || "");
    const item = String(r.itemName || "");
    const qty = String(Number(r.quantity) || 0);
    return `${id}|${ts}|${dept}|${by}|${item}|${qty}`;
  });
  const fingerprint = fingerprintLines.join("\n");
  const verificationHash = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");

  const now = new Date();
  const generatedLabel = now.toLocaleString("en-PH");
  const reportMonthLabel = (targetMonth + 1).toString().padStart(2, "0");
  const reportLabel = `${month || reportMonthLabel}/${year || targetYear}`;

  const qrPayload = {
    system: "COT Inventory System",
    reportType: "Super Admin Transaction History",
    period: {
      month: Number(month || targetMonth + 1),
      year: Number(year || targetYear),
      start: start.toISOString(),
      end: end.toISOString(),
    },
    totals: {
      transactions: totalTransactions,
      quantityIssued: totalQtyIssued,
    },
    generatedAt: now.toISOString(),
    generatedBy: req.user?.name || "Super Admin",
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
        light: "#00000000", // transparent background
      },
    });
  } catch (e) {
    console.warn("QR generation failed:", e?.message || e);
  }

  const uniqueDepartments = new Set(
    transactions.map((r) => r.department).filter(Boolean)
  );
  const uniqueRequesters = new Set(
    transactions.map((r) => r.requestedBy).filter(Boolean)
  );

  const issuedByDepartment = {};
  transactions.forEach((r) => {
    const dept = r.department || "Unknown";
    issuedByDepartment[dept] = (issuedByDepartment[dept] || 0) + (Number(r.quantity) || 0);
  });
  const topDepartments = Object.entries(issuedByDepartment)
    .map(([department, qtyIssued]) => ({ department, qtyIssued }))
    .sort((a, b) => b.qtyIssued - a.qtyIssued)
    .slice(0, 5);

  const issuedByItem = {};
  transactions.forEach((r) => {
    const item = r.itemName || "Unknown";
    issuedByItem[item] = (issuedByItem[item] || 0) + (Number(r.quantity) || 0);
  });
  const topItems = Object.entries(issuedByItem)
    .map(([itemName, qtyIssued]) => ({ itemName, qtyIssued }))
    .sort((a, b) => b.qtyIssued - a.qtyIssued)
    .slice(0, 5);

  const shortId = (id) => {
    const s = String(id || "");
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  const summaryTableBody = [
    [{ text: "Metric", bold: true }, { text: "Value", bold: true }],
    ["Total transactions", String(totalTransactions)],
    ["Total quantity issued", String(totalQtyIssued)],
    ["Departments involved", String(uniqueDepartments.size)],
    ["Unique requesters", String(uniqueRequesters.size)],
  ];

  const topDeptTableBody = [
    [{ text: "Top departments by quantity issued", bold: true }, { text: "Qty issued", bold: true }],
    ...(topDepartments.length
      ? topDepartments.map((d) => [d.department, String(d.qtyIssued)])
      : [["—", "0"]]),
  ];

  const topItemsTableBody = [
    [{ text: "Top items by quantity issued", bold: true }, { text: "Qty issued", bold: true }],
    ...(topItems.length
      ? topItems.map((i) => [i.itemName, String(i.qtyIssued)])
      : [["—", "0"]]),
  ];

  const transactionsTableBody = [
    [
      { text: "Transaction ID", bold: true },
      { text: "Date & time", bold: true },
      { text: "Type", bold: true },
      { text: "Department", bold: true },
      { text: "Requested by", bold: true },
      { text: "Item", bold: true },
      { text: "Qty", bold: true, alignment: "right" },
      { text: "Status", bold: true },
    ],
  ];

  transactions.forEach((r) => {
    const status = "Approved";
    transactionsTableBody.push([
      { text: shortId(r._id), fontSize: 8 },
      { text: new Date(r.requestedAt || r.createdAt).toLocaleString("en-PH"), fontSize: 8 },
      { text: "Issue (request)", fontSize: 8 },
      { text: r.department || "—", fontSize: 8 },
      { text: r.requestedBy || "—", fontSize: 8 },
      { text: r.itemName || "—", fontSize: 8 },
      { text: String(r.quantity ?? "—"), fontSize: 8, alignment: "right" },
      {
        text: status,
        fontSize: 8,
        color: "#047857",
      },
    ]);
  });

  // Get logged-in user's name for "Prepared by" section (should be super admin)
  const preparedByName = req.user?.name || "Super Admin";
  
  // Fixed names for other sections
  const deanName = "Dr. Marilou O. Espina";

  // Generate signature images
  const preparedBySignature = generateSignatureImage(preparedByName);
  const deanSignature = generateSignatureImage(deanName);

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
          text: "Super Admin Transaction History Report",
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
        {
          text: "For internal use only. College of Technology.",
          fontSize: 7,
          color: "#888",
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          alignment: "center",
          color: "#666",
        },
        {
          text: `Total transactions: ${totalTransactions}`,
          fontSize: 7,
          alignment: "right",
          color: "#888",
        },
      ],
      margin: [40, 8, 40, 15],
    }),
    content: [
      {
        columns: [
          { image: logoPath, width: 60 },
          {
            stack: [
              { text: "BUKIDNON STATE UNIVERSITY", bold: true, fontSize: 13, alignment: "center" },
              { text: "College of Technology", alignment: "center" },
              { text: "Malaybalay City, Bukidnon 8700", alignment: "center" },
              { text: "Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph", fontSize: 9, alignment: "center" },
            ],
          },
        ],
      },
      {
        text: "\nTRANSACTION HISTORY REPORT",
        alignment: "center",
        bold: true,
        fontSize: 14,
        color: "#fff",
        fillColor: "#333",
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: `Inclusive Dates: ${start.toLocaleDateString("en-PH")} - ${end.toLocaleDateString(
                  "en-PH"
                )}\nPeriod: ${reportLabel} | Generated: ${generatedLabel}`,
                alignment: "left",
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
              ...(qrDataUrl ? [{ image: qrDataUrl, width: 120, alignment: "right" }] : []),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 10],
      },
      { text: "Summary", style: "sectionHeader" },
      {
        columns: [
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: summaryTableBody },
            layout: "lightHorizontalLines",
          },
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: topDeptTableBody },
            layout: "lightHorizontalLines",
          },
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: topItemsTableBody },
            layout: "lightHorizontalLines",
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 12],
      },
      {
        text: "Transaction list (chronological)",
        style: "sectionHeader",
        margin: [0, 10, 0, 6],
      },
      {
        table: {
          headerRows: 1,
          widths: [80, 120, 80, 120, 120, "*", 50, 80],
          body: transactionsTableBody,
        },
        layout: "lightHorizontalLines",
      },
      {
        text: "\nNotes:\n- This report includes completed/posted transactions only (stock issuances).\n- Restocks and manual adjustments (if any) are tracked separately via inventory updates/system logs.",
        fontSize: 9,
        color: "#444",
        margin: [0, 10, 0, 0],
      },
      { text: "", pageBreak: "after" },
      { text: "\nAnalysis/Remarks (3–5 sentences):", bold: true, margin: [0, 20, 0, 10] },
      { text: "_____________________________________________________________\n".repeat(4), margin: [0, 0, 0, 50] },
      {
        stack: [
          { text: "Prepared by:", bold: true, margin: [0, 0, 0, 12] },
          ...(preparedBySignature ? [{ image: preparedBySignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: preparedByName, alignment: "left", margin: [0, 0, 0, 5] },
          { text: "Super Admin - College of Technology", fontSize: 9, alignment: "left", margin: [0, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 35],
      },
      {
        stack: [
          { text: "Approved by:", bold: true, margin: [0, 0, 0, 12] },
          ...(deanSignature ? [{ image: deanSignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: deanName, alignment: "left", margin: [0, 0, 0, 5] },
          { text: "Dean/Head - College of Technology", fontSize: 9, alignment: "left", margin: [0, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 0],
      },
    ],
    styles: {
      sectionHeader: {
        fontSize: 13,
        bold: true,
        margin: [0, 20, 0, 10],
      },
    },
    defaultStyle: { font: "Arial", fontSize: 10 },
  };

  try {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const reportsDir = "./reports";
    fs.mkdirSync(reportsDir, { recursive: true });

    const filePath = path.resolve(
      `${reportsDir}/Transaction_History_${month || targetMonth + 1}_${year || targetYear}.pdf`
    );

    const stream = fs.createWriteStream(filePath);
    
    pdfDoc.pipe(stream);
    
    pdfDoc.on("error", (error) => {
      console.error("PDF generation error:", error);
      stream.destroy();
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF: " + error.message });
      }
    });
    
    stream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to write PDF file: " + error.message });
      }
    });
    
    stream.on("finish", () => {
      if (!res.headersSent) {
        res.download(filePath, (err) => {
          if (err) {
            console.error("Download error:", err);
            if (!res.headersSent) {
              res.status(500).json({ message: "Failed to download PDF: " + err.message });
            }
          }
        });
      }
    });
    
    pdfDoc.end();
  } catch (error) {
    console.error("Error creating PDF document:", error);
    res.status(500).json({ message: "Failed to generate report: " + error.message });
  }
});

export const generateRequestLogReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const { start, end, targetYear, targetMonth } = getDateRange(month, year);

  const requests = await Request.find({
    requestedAt: { $gte: start, $lte: end },
  }).sort({ requestedAt: 1 });

  if (requests.length === 0) {
    res.status(404);
    throw new Error("No request log data found for this period.");
  }

  const totalRequests = requests.length;
  const totalQtyRequested = requests.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0
  );

  const approvedRequests = requests.filter((r) =>
    APPROVED_STATUSES.includes(r.status)
  );
  const rejectedRequests = requests.filter((r) =>
    REJECTED_STATUSES.includes(r.status)
  );
  const canceledRequests = requests.filter((r) =>
    CANCELED_STATUSES.includes(r.status)
  );
  const pendingRequests = requests.filter((r) => r.status === "Pending");

  const totalQtyApproved = approvedRequests.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0
  );

  const uniqueDepartments = new Set(
    requests.map((r) => r.department).filter(Boolean)
  );
  const uniqueRequesters = new Set(
    requests.map((r) => r.requestedBy).filter(Boolean)
  );

  const now = new Date();
  const generatedLabel = now.toLocaleString("en-PH");
  const reportMonthLabel = (targetMonth + 1).toString().padStart(2, "0");
  const reportLabel = `${month || reportMonthLabel}/${year || targetYear}`;

  const fingerprintLines = requests.map((r) => {
    const id = String(r._id || "");
    const ts = new Date(r.requestedAt || r.createdAt || 0).toISOString();
    const dept = String(r.department || "");
    const by = String(r.requestedBy || "");
    const item = String(r.itemName || "");
    const qty = String(Number(r.quantity) || 0);
    const status = String(normalizeRequestStatus(r.status));
    const reason = String(r.rejectionReason || "");
    return `${id}|${ts}|${dept}|${by}|${item}|${qty}|${status}|${reason}`;
  });
  const verificationHash = crypto
    .createHash("sha256")
    .update(fingerprintLines.join("\n"))
    .digest("hex");

  const qrPayload = {
    system: "COT Inventory System",
    reportType: "Super Admin Request Log",
    period: {
      month: Number(month || targetMonth + 1),
      year: Number(year || targetYear),
      start: start.toISOString(),
      end: end.toISOString(),
    },
    totals: {
      requests: totalRequests,
      pending: pendingRequests.length,
      approved: approvedRequests.length,
      rejected: rejectedRequests.length,
      canceled: canceledRequests.length,
      quantityRequested: totalQtyRequested,
      quantityApproved: totalQtyApproved,
    },
    generatedAt: now.toISOString(),
    generatedBy: req.user?.name || "Super Admin",
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

  const requestedByItem = {};
  requests.forEach((r) => {
    const item = r.itemName || "Unknown";
    requestedByItem[item] = (requestedByItem[item] || 0) + (Number(r.quantity) || 0);
  });
  const topItems = Object.entries(requestedByItem)
    .map(([itemName, qtyRequested]) => ({ itemName, qtyRequested }))
    .sort((a, b) => b.qtyRequested - a.qtyRequested)
    .slice(0, 5);

  const shortId = (id) => {
    const s = String(id || "");
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  const summaryTableBody = [
    [{ text: "Metric", bold: true }, { text: "Value", bold: true }],
    ["Total requests", String(totalRequests)],
    ["Pending", String(pendingRequests.length)],
    ["Approved", String(approvedRequests.length)],
    ["Rejected", String(rejectedRequests.length)],
    ["Canceled", String(canceledRequests.length)],
    ["Total quantity requested", String(totalQtyRequested)],
    ["Total quantity approved", String(totalQtyApproved)],
    ["Departments involved", String(uniqueDepartments.size)],
    ["Unique requesters", String(uniqueRequesters.size)],
  ];

  const topItemsTableBody = [
    [{ text: "Top items by quantity requested", bold: true }, { text: "Qty requested", bold: true }],
    ...(topItems.length
      ? topItems.map((i) => [i.itemName, String(i.qtyRequested)])
      : [["—", "0"]]),
  ];

  const statusTableBody = [
    [{ text: "Status", bold: true }, { text: "Count", bold: true }],
    ["Pending", String(pendingRequests.length)],
    ["Approved", String(approvedRequests.length)],
    ["Rejected", String(rejectedRequests.length)],
    ["Canceled", String(canceledRequests.length)],
  ];

  const requestsTableBody = [
    [
      { text: "Request ID", bold: true },
      { text: "Date & time", bold: true },
      { text: "Department", bold: true },
      { text: "Requested by", bold: true },
      { text: "Item", bold: true },
      { text: "Qty", bold: true, alignment: "right" },
      { text: "Status", bold: true },
      { text: "Reason", bold: true },
    ],
  ];

  requests.forEach((r) => {
    const normalizedStatus = normalizeRequestStatus(r.status);
    let statusColor = "#475569";
    if (normalizedStatus === "Approved") statusColor = "#047857";
    if (normalizedStatus === "Rejected") statusColor = "#b91c1c";
    if (normalizedStatus === "Canceled") statusColor = "#b45309";
    if (normalizedStatus === "Pending") statusColor = "#a16207";

    requestsTableBody.push([
      { text: shortId(r._id), fontSize: 8 },
      { text: new Date(r.requestedAt || r.createdAt).toLocaleString("en-PH"), fontSize: 8 },
      { text: r.department || "—", fontSize: 8 },
      { text: r.requestedBy || "—", fontSize: 8 },
      { text: r.itemName || "—", fontSize: 8 },
      { text: String(r.quantity ?? "—"), fontSize: 8, alignment: "right" },
      { text: normalizedStatus, fontSize: 8, color: statusColor },
      { text: r.rejectionReason || "—", fontSize: 8 },
    ]);
  });

  const preparedByName = req.user?.name || "Super Admin";
  const deanName = "Dr. Marilou O. Espina";
  const preparedBySignature = generateSignatureImage(preparedByName);
  const deanSignature = generateSignatureImage(deanName);

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
          text: "Super Admin Request Log Report",
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
        {
          text: "For internal use only. College of Technology.",
          fontSize: 7,
          color: "#888",
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          alignment: "center",
          color: "#666",
        },
        {
          text: `Total requests: ${totalRequests}`,
          fontSize: 7,
          alignment: "right",
          color: "#888",
        },
      ],
      margin: [40, 8, 40, 15],
    }),
    content: [
      {
        columns: [
          { image: logoPath, width: 60 },
          {
            stack: [
              { text: "BUKIDNON STATE UNIVERSITY", bold: true, fontSize: 13, alignment: "center" },
              { text: "College of Technology", alignment: "center" },
              { text: "Malaybalay City, Bukidnon 8700", alignment: "center" },
              { text: "Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph", fontSize: 9, alignment: "center" },
            ],
          },
        ],
      },
      {
        text: "\nREQUEST LOG REPORT",
        alignment: "center",
        bold: true,
        fontSize: 14,
        color: "#fff",
        fillColor: "#333",
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: `Inclusive Dates: ${start.toLocaleDateString("en-PH")} - ${end.toLocaleDateString(
                  "en-PH"
                )}\nPeriod: ${reportLabel} | Generated: ${generatedLabel}`,
                alignment: "left",
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
              ...(qrDataUrl ? [{ image: qrDataUrl, width: 120, alignment: "right" }] : []),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 10],
      },
      { text: "Summary", style: "sectionHeader" },
      {
        columns: [
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: summaryTableBody },
            layout: "lightHorizontalLines",
          },
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: statusTableBody },
            layout: "lightHorizontalLines",
          },
          {
            width: "*",
            table: { headerRows: 1, widths: ["*", "auto"], body: topItemsTableBody },
            layout: "lightHorizontalLines",
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 12],
      },
      {
        text: "Request lifecycle list (chronological)",
        style: "sectionHeader",
        margin: [0, 10, 0, 6],
      },
      {
        table: {
          headerRows: 1,
          widths: [80, 120, 100, 120, "*", 45, 70, 140],
          body: requestsTableBody,
        },
        layout: "lightHorizontalLines",
      },
      {
        text: "\nNotes:\n- This report includes all request states (Pending, Approved, Rejected, and Canceled).\n- Quantity approved reflects stock movements actually posted to inventory.",
        fontSize: 9,
        color: "#444",
        margin: [0, 10, 0, 0],
      },
      { text: "", pageBreak: "after" },
      { text: "\nAnalysis/Remarks (3-5 sentences):", bold: true, margin: [0, 20, 0, 10] },
      { text: "_____________________________________________________________\n".repeat(4), margin: [0, 0, 0, 50] },
      {
        stack: [
          { text: "Prepared by:", bold: true, margin: [0, 0, 0, 12] },
          ...(preparedBySignature ? [{ image: preparedBySignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: preparedByName, alignment: "left", margin: [0, 0, 0, 5] },
          { text: "Super Admin - College of Technology", fontSize: 9, alignment: "left", margin: [0, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 35],
      },
      {
        stack: [
          { text: "Approved by:", bold: true, margin: [0, 0, 0, 12] },
          ...(deanSignature ? [{ image: deanSignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: deanName, alignment: "left", margin: [0, 0, 0, 5] },
          { text: "Dean/Head - College of Technology", fontSize: 9, alignment: "left", margin: [0, 0, 0, 0] },
        ],
      },
    ],
    styles: {
      sectionHeader: {
        fontSize: 13,
        bold: true,
        margin: [0, 20, 0, 10],
      },
    },
    defaultStyle: { font: "Arial", fontSize: 10 },
  };

  try {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const reportsDir = "./reports";
    fs.mkdirSync(reportsDir, { recursive: true });

    const filePath = path.resolve(
      `${reportsDir}/Request_Log_${month || targetMonth + 1}_${year || targetYear}.pdf`
    );

    const stream = fs.createWriteStream(filePath);

    pdfDoc.pipe(stream);

    pdfDoc.on("error", (error) => {
      console.error("PDF generation error:", error);
      stream.destroy();
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF: " + error.message });
      }
    });

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to write PDF file: " + error.message });
      }
    });

    stream.on("finish", () => {
      if (!res.headersSent) {
        res.download(filePath, (err) => {
          if (err) {
            console.error("Download error:", err);
            if (!res.headersSent) {
              res.status(500).json({ message: "Failed to download PDF: " + err.message });
            }
          }
        });
      }
    });

    pdfDoc.end();
  } catch (error) {
    console.error("Error creating PDF document:", error);
    res.status(500).json({ message: "Failed to generate report: " + error.message });
  }
});

