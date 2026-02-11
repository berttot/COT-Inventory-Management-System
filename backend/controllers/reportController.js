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

const logoPath = path.resolve("./image/buksulogo.png");

export const generateDepartmentReport = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { month, year } = req.query;

  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getFullYear();
  const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();
  const start = new Date(targetYear, targetMonth, 1);
  const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

  const requests = await Request.find({
    department,
    requestedAt: { $gte: start, $lte: end },
  }).sort({ requestedAt: 1 });

  if (requests.length === 0) {
    res.status(404);
    throw new Error("No data found for this period.");
  }

  // For this report, "transactions" means completed/posted issuances only.
  const transactions = requests.filter((r) => r.status === "Successful");
  if (transactions.length === 0) {
    res.status(404);
    throw new Error("No completed transactions found for this period.");
  }

  const totalTransactions = transactions.length;
  const totalQtyIssued = transactions.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0
  );

  const uniqueRequesters = new Set(
    transactions.map((r) => r.requestedBy).filter(Boolean)
  );

  const issuedByItem = {};
  transactions.forEach((r) => {
    const item = r.itemName || "Unknown";
    issuedByItem[item] = (issuedByItem[item] || 0) + (Number(r.quantity) || 0);
  });
  const topItems = Object.entries(issuedByItem)
    .map(([itemName, qtyIssued]) => ({ itemName, qtyIssued }))
    .sort((a, b) => b.qtyIssued - a.qtyIssued)
    .slice(0, 8);

  const shortId = (id) => {
    const s = String(id || "");
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  // --- Scannable verification (QR + SHA-256 hash) ---
  const fingerprintLines = transactions.map((r) => {
    const id = String(r._id || "");
    const ts = new Date(r.requestedAt || r.createdAt || 0).toISOString();
    const by = String(r.requestedBy || "");
    const item = String(r.itemName || "");
    const qty = String(Number(r.quantity) || 0);
    return `${id}|${ts}|${department}|${by}|${item}|${qty}`;
  });
  const fingerprint = fingerprintLines.join("\n");
  const verificationHash = crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");

  const generatedLabel = now.toLocaleString("en-PH");
  const reportMonthLabel = (targetMonth + 1).toString().padStart(2, "0");
  const reportLabel = `${month || reportMonthLabel}/${year || targetYear}`;

  const qrPayload = {
    system: "COT Inventory System",
    reportType: "Department Transaction History",
    department,
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
    generatedBy: req.user?.name || "Department Admin",
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
    ["Department", department],
    ["Total transactions", String(totalTransactions)],
    ["Total quantity issued", String(totalQtyIssued)],
    ["Unique requesters", String(uniqueRequesters.size)],
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
      { text: "Requested by", bold: true },
      { text: "Item", bold: true },
      { text: "Qty", bold: true, alignment: "right" },
      { text: "Status", bold: true },
    ],
  ];

  transactions.forEach((r) => {
    transactionsTableBody.push([
      { text: shortId(r._id), fontSize: 8 },
      { text: new Date(r.requestedAt || r.createdAt).toLocaleString("en-PH"), fontSize: 8 },
      { text: "Issue (request)", fontSize: 8 },
      { text: r.requestedBy || "—", fontSize: 8 },
      { text: r.itemName || "—", fontSize: 8 },
      { text: String(r.quantity ?? "—"), fontSize: 8, alignment: "right" },
      { text: "Posted", fontSize: 8, color: "#047857" },
    ]);
  });

  // Get logged-in user's name for "Prepared by" section
  const preparedByName = req.user?.name || "Department Admin";
  
  // Fixed names for other sections
  const superAdminName = "Mylaflor T. Mansaladez";
  const deanName = "Dr. Marilou O. Espina";

  // Generate signature images
  const preparedBySignature = generateSignatureImage(preparedByName);
  const superAdminSignature = generateSignatureImage(superAdminName);
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
          text: `Department Transaction History Report - ${department}`,
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
          { image: logoPath, width: 60, alignment: "left" },
          {
            stack: [
              { text: "BUKIDNON STATE UNIVERSITY", bold: true, fontSize: 13, alignment: "center" },
              { text: "Malaybalay City, Bukidnon 8700", alignment: "center" },
              { text: "College of Technology", alignment: "center" },
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
                )}\nOffice/Department: COT - ${department} Department\nPeriod: ${reportLabel} | Generated: ${generatedLabel}`,
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
        margin: [0, 0, 0, 12],
      },
      {
        text: "Summary",
        style: "sectionHeader",
        margin: [0, 0, 0, 6],
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
          widths: [90, 130, 90, 140, "*", 55, 80],
          body: transactionsTableBody,
        },
        layout: "lightHorizontalLines",
      },
      {
        text: "\nNotes:\n- This report includes completed/posted transactions only (stock issuances for this department).\n- Restocks and manual adjustments (if any) are tracked separately via inventory updates/system logs.",
        fontSize: 9,
        color: "#444",
        margin: [0, 10, 0, 0],
      },
      { text: "", pageBreak: "after" },
      {
        columns: [
          { image: logoPath, width: 60, alignment: "left" },
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
      { text: "\nAnalysis/Remarks (3–5 sentences):", bold: true, margin: [0, 20, 0, 10] },
      { text: "_____________________________________________________________\n".repeat(4), margin: [0, 0, 0, 50] },
      {
        stack: [
          { text: "Prepared by:", bold: true, margin: [0, 0, 0, 12] },
          ...(preparedBySignature ? [{ image: preparedBySignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: preparedByName, alignment: "left", margin: [0, 0, 0, 5] },
          { text: `Departmental Admin - ${department}`, fontSize: 9, alignment: "left", margin: [0, 0, 0, 0] },
        ],
        margin: [0, 0, 0, 35],
      },
      {
        stack: [
          { text: "Checked by:", bold: true, margin: [0, 0, 0, 12] },
          ...(superAdminSignature ? [{ image: superAdminSignature, width: 160, alignment: "left", margin: [0, 0, 0, 6] }] : []),
          { text: superAdminName, alignment: "left", margin: [0, 0, 0, 5] },
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
      subheader: { fontSize: 12, bold: true },
      sectionHeader: { fontSize: 13, bold: true, margin: [0, 14, 0, 8] },
    },
    defaultStyle: { font: "Arial", fontSize: 10 },
  };

  try {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const reportsDir = "./reports";
    fs.mkdirSync(reportsDir, { recursive: true });
    const filePath = path.resolve(
      `${reportsDir}/Transaction_History_${department}_${month || targetMonth + 1}_${year || targetYear}.pdf`
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

