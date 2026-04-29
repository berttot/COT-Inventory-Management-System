import express from "express";
import {
  approveRequest,
  cancelRequest,
  createRequest,
  getAllDepartmentRequests,
  getDepartmentActivity,
  getPendingRequestAlertCount,
  getPendingRequestAlertSummary,
  getDepartmentRequests,
  getDepartmentStats,
  getRequestTrends,
  rejectRequest,
  getStaffRequests,
  getStaffSummary,
  getSummary,
} from "../controllers/requestController.js";
import { auth, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

const requireStaff = (req, res, next) => {
  if (!req.user || req.user.role !== "staff") {
    return res.status(403).json({ message: "Access denied: Staff only" });
  }
  next();
};

router.post("/", createRequest);
router.patch("/:id/approve", auth, requireSuperAdmin, approveRequest);
router.patch("/:id/reject", auth, requireSuperAdmin, rejectRequest);
router.patch("/:id/cancel", auth, requireStaff, cancelRequest);
router.get("/alerts/pending-count", auth, requireSuperAdmin, getPendingRequestAlertCount);
router.get("/alerts/pending-summary", auth, requireSuperAdmin, getPendingRequestAlertSummary);
router.get("/staff/:userId", getStaffRequests);
router.get("/department/:department", getDepartmentRequests);
router.get("/stats/:department", getDepartmentStats);
router.get("/all", getAllDepartmentRequests);
router.get("/summary", getSummary);
router.get("/trends", getRequestTrends);
router.get("/department-activity", getDepartmentActivity);
router.get("/staff-summary/:userId", getStaffSummary);

export default router;
