import express from "express";
import { generateCombinedReport } from "../controllers/superAdminReportController.js";

const router = express.Router();

router.get("/combined", generateCombinedReport);

export default router;
