import express from "express";
import {
  createLog,
  createLogoutLog,
  getLogs,
  getLogsPdf,
} from "../controllers/logController.js";
import { auth, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Write logs: authenticated users only (prevents spoofed entries)
router.post("/", auth, createLog);
router.post("/logout", auth, createLogoutLog);

// Read/export logs: Super Admin only
router.get("/", auth, requireSuperAdmin, getLogs);
router.get("/export/pdf", auth, requireSuperAdmin, getLogsPdf);

export default router;
