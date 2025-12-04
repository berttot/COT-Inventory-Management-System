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

const getChartImageBase64 = async (itemCount) => {
  const chartConfig = {
    type: "bar",
    data: {
      labels: Object.keys(itemCount),
      datasets: [
        {
          label: "Most Requested Items",
          data: Object.values(itemCount),
          backgroundColor: "rgba(54,162,235,0.7)",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Points scored" },
      },
      scales: { y: { beginAtZero: true } },
    },
  };

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}&format=png&width=700&height=400`;

  const response = await fetch(chartUrl);
  const buffer = await response.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
};

export const generateDepartmentReport = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { month, year } = req.query;

  const logoPath = path.resolve("./image/buksulogo.png");
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
    throw new Error("No requests found for this period.");
  }

  const tableBody = [
    [
      { text: "Requested By", bold: true },
      { text: "Item", bold: true },
      { text: "Quantity", bold: true },
      { text: "Date", bold: true },
      { text: "Status", bold: true },
    ],
  ];

  requests.forEach((request) => {
    tableBody.push([
      request.requestedBy,
      request.itemName,
      request.quantity.toString(),
      new Date(request.requestedAt).toLocaleDateString("en-PH"),
      request.status,
    ]);
  });

  const itemCount = {};
  requests.forEach((request) => {
    if (request.status === "Successful") {
      itemCount[request.itemName] = (itemCount[request.itemName] || 0) + Number(request.quantity);
    }
  });

  const chartBase64 = await getChartImageBase64(itemCount);

  const docDefinition = {
    pageMargins: [40, 60, 40, 60],
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
        text: "\nMONTHLY INVENTORY REPORT",
        alignment: "center",
        bold: true,
        fontSize: 14,
        color: "#fff",
        fillColor: "#333",
        margin: [0, 10, 0, 10],
      },
      {
        text: `Inclusive Dates: ${start.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}\nName of Office: COT - ${department} Department`,
        margin: [0, 0, 0, 15],
      },
      {
        text: "Transaction and Reports:",
        style: "subheader",
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", 60, 70, 80],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
      { text: "\nSummary of most requested items in bar graph", bold: true, margin: [0, 10, 0, 10] },
      {
        image: chartBase64,
        width: 450,
        alignment: "center",
        margin: [0, 0, 0, 20],
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
      { text: "\nAnalysis/Description of the results (3-5 sentences will do).", bold: true, margin: [0, 20, 0, 10] },
      { text: "_____________________________________________________________\n".repeat(3), margin: [0, 0, 0, 40] },
      { text: "\n\n\n\n\n\n\n\n\n\n\n\n\n\nPrepared by:\n\n", bold: true, margin: [0, 0, 0, 5] },
      { text: "__________________________", margin: [0, 0, 0, 5] },
      { text: `Departmental Admin - ${department}` },
      { text: "\nChecked by:\n\n", bold: true, margin: [0, 20, 0, 5] },
      { text: "__________________________", margin: [0, 0, 0, 5] },
      { text: "Super Admin - College of Technology" },
      { text: "\nApproved by:\n\n", bold: true, margin: [0, 20, 0, 5] },
      { text: "__________________________", margin: [0, 0, 0, 5] },
      { text: "Dean/Head - College of Technology" },
    ],
    styles: {
      subheader: { fontSize: 12, bold: true },
    },
    defaultStyle: { font: "Arial", fontSize: 10 },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const reportsDir = "./reports";
  fs.mkdirSync(reportsDir, { recursive: true });
  const filePath = path.resolve(`${reportsDir}/${department}_report_${month || targetMonth + 1}_${year || targetYear}.pdf`);
  const stream = fs.createWriteStream(filePath);
  pdfDoc.pipe(stream);
  pdfDoc.end();

  stream.on("finish", () => {
    res.download(filePath);
  });
});

