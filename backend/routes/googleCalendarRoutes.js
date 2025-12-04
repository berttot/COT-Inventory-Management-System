import express from "express";
import {
  createEvent,
  debugEvents,
  getAlerts,
  getAuthPage,
  getStockEvents,
  handleCallback,
} from "../controllers/googleCalendarController.js";

const router = express.Router();

router.get("/auth", getAuthPage);
router.get("/callback", handleCallback);
router.post("/create", createEvent);
router.get("/events", getStockEvents);
router.get("/alerts", getAlerts);
router.get("/debug", debugEvents);

export default router;
