import express from "express";
import { generateDepartmentReport } from "../controllers/reportController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/department/:department", auth, generateDepartmentReport);

export default router;
