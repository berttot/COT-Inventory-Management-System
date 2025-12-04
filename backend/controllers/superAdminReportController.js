import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import PdfPrinter from "pdfmake";
import Request from "../models/RequestModel.js";
import asyncHandler from "../middleware/asyncHandler.js";

const printer = new PdfPrinter({
  Arial: {
    normal: "./fonts/arial.ttf",
    bold: "./fonts/arialbd.ttf",
    italics: "./fonts/arial.ttf",
    bolditalics: "./fonts/arialbd.ttf",
  },
});

const getChartImageBase64 = async (chartConfig) => {
  const url = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}&format=png&width=700&height=400`;

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
};

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

export const generateCombinedReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const { start, end, targetYear, targetMonth } = getDateRange(month, year);

  const requests = await Request.find({
    requestedAt: { $gte: start, $lte: end },
  });

  if (requests.length === 0) {
    res.status(404);
    throw new Error("No data found for this period.");
  }

  const departmentStats = {};
  requests.forEach((request) => {
    const dept = request.department || "Unknown";
    if (!departmentStats[dept]) {
      departmentStats[dept] = { totalRequests: 0, totalQuantity: 0 };
    }
    departmentStats[dept].totalRequests++;
    departmentStats[dept].totalQuantity += Number(request.quantity);
  });

  const depTableBody = [
    [
      { text: "Department", bold: true },
      { text: "Total Requests", bold: true },
      { text: "Total Quantity Requested", bold: true },
    ],
  ];

  Object.entries(departmentStats).forEach(([dept, stats]) => {
    depTableBody.push([
      dept,
      stats.totalRequests.toString(),
      stats.totalQuantity.toString(),
    ]);
  });

  const depChartConfig = {
    type: "bar",
    data: {
      labels: Object.keys(departmentStats),
      datasets: [
        {
          label: "Total Requests",
          data: Object.values(departmentStats).map((d) => d.totalRequests),
          backgroundColor: "rgba(54,162,235,0.7)",
        },
        {
          label: "Total Quantity Requested",
          data: Object.values(departmentStats).map((d) => d.totalQuantity),
          backgroundColor: "rgba(255,206,86,0.7)",
        },
      ],
    },
  };

  const depChartBase64 = await getChartImageBase64(depChartConfig);

  const itemStats = {};
  requests.forEach((request) => {
    const item = request.itemName || "Unknown";
    const dept = request.department || "Unknown";

    if (!itemStats[item]) {
      itemStats[item] = {
        totalQuantity: 0,
        departments: new Set(),
      };
    }

    itemStats[item].totalQuantity += Number(request.quantity);
    itemStats[item].departments.add(dept);
  });

  const finalItems = Object.entries(itemStats)
    .map(([item, data]) => ({
      item,
      totalQuantity: data.totalQuantity,
      departmentsCount: data.departments.size,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  const itemTableBody = [
    [
      { text: "Item Name", bold: true },
      { text: "Total Quantity", bold: true },
      { text: "Departments Requested", bold: true },
    ],
  ];

  finalItems.forEach((item) =>
    itemTableBody.push([
      item.item,
      item.totalQuantity.toString(),
      item.departmentsCount.toString(),
    ])
  );

  const topItems = finalItems.slice(0, 10);
  const itemChartConfig = {
    type: "bar",
    data: {
      labels: topItems.map((i) => i.item),
      datasets: [
        {
          label: "Quantity Requested",
          data: topItems.map((i) => i.totalQuantity),
          backgroundColor: "rgba(75,192,192,0.7)",
        },
      ],
    },
  };

  const itemChartBase64 = await getChartImageBase64(itemChartConfig);

  const docDefinition = {
    pageMargins: [40, 60, 40, 60],
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
      { text: `\nInclusive Dates: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, alignment: "center" },
      { text: "\n1. Department Summary", style: "sectionHeader" },
      {
        table: { headerRows: 1, widths: ["*", "auto", "auto"], body: depTableBody },
        layout: "lightHorizontalLines",
        margin: [0, 5, 0, 20],
      },
      { image: depChartBase64, width: 500, alignment: "center", margin: [0, 10, 0, 20] },
      { text: "", pageBreak: "after" },
      { text: "2. Most Requested Items", style: "sectionHeader" },
      {
        table: { headerRows: 1, widths: ["*", "auto", "auto"], body: itemTableBody },
        layout: "lightHorizontalLines",
        margin: [0, 10, 0, 20],
      },
      { image: itemChartBase64, width: 500, alignment: "center" },
      { text: "", pageBreak: "after" },
      { text: "\nAnalysis/Remarks (3–5 sentences):", bold: true, margin: [0, 20, 0, 10] },
      { text: "_____________________________________________________________\n".repeat(4), margin: [0, 0, 0, 30] },
      { text: "Prepared by:", bold: true, margin: [0, 30, 0, 5] },
      { text: "__________________________\nSuper Admin - College of Technology" },
      { text: "\nApproved by:", bold: true, margin: [0, 20, 0, 5] },
      { text: "__________________________\nDean/Head - College of Technology" },
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

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const reportsDir = "./reports";
  fs.mkdirSync(reportsDir, { recursive: true });

  const filePath = path.resolve(
    `${reportsDir}/Combined_Report_${month || targetMonth + 1}_${year || targetYear}.pdf`
  );

  const stream = fs.createWriteStream(filePath);
  pdfDoc.pipe(stream);
  pdfDoc.end();

  stream.on("finish", () => res.download(filePath));
});

