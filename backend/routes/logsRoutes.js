import express from "express";
import {
  createLog,
  createLogoutLog,
  getLogs,
  getLogsPdf,
} from "../controllers/logController.js";
import { auth, optionalAuth, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Write logs: authenticated users only (prevents spoofed entries)
router.post("/", auth, createLog);
// Logout: use optional auth to handle interrupted connections gracefully
// Records logout even if connection is severed before full authentication completes
router.post("/logout", optionalAuth, createLogoutLog);

// Read/export logs: Super Admin only
router.get("/", auth, requireSuperAdmin, getLogs);
router.get("/export/pdf", auth, requireSuperAdmin, getLogsPdf);

export default router;
