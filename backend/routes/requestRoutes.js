import express from "express";
import {
  createRequest,
  getAllDepartmentRequests,
  getDepartmentActivity,
  getDepartmentRequests,
  getDepartmentStats,
  getRequestTrends,
  getStaffRequests,
  getStaffSummary,
  getSummary,
} from "../controllers/requestController.js";

const router = express.Router();

router.post("/", createRequest);
router.get("/staff/:userId", getStaffRequests);
router.get("/department/:department", getDepartmentRequests);
router.get("/stats/:department", getDepartmentStats);
router.get("/all", getAllDepartmentRequests);
router.get("/summary", getSummary);
router.get("/trends", getRequestTrends);
router.get("/department-activity", getDepartmentActivity);
router.get("/staff-summary/:userId", getStaffSummary);

export default router;
