import express from "express";
import dotenv from "dotenv";
import { sendInvite } from "../controllers/inviteController.js";

dotenv.config();
const router = express.Router();

router.post("/", sendInvite);

export default router;
