import express from "express";
import { generateCombinedReport } from "../controllers/superAdminReportController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/combined", auth, generateCombinedReport);

export default router;
