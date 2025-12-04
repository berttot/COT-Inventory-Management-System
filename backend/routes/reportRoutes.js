import express from "express";
import { generateDepartmentReport } from "../controllers/reportController.js";

const router = express.Router();

router.get("/department/:department", generateDepartmentReport);

export default router;
