import express from "express";
import {
	generateCombinedReport,
	generateRequestLogReport,
} from "../controllers/superAdminReportController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/combined", auth, generateCombinedReport);
router.get("/request-log", auth, generateRequestLogReport);

export default router;
