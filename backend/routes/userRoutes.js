import express from "express";
import {
  archiveUser,
  changePassword,
  createUser,
  forgotPassword,
  getUserCount,
  getUsers,
  lockUser,
  resetPassword,
  streamUserLocks,
  unarchiveUser,
  unlockUser,
  updateUser,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/count", getUserCount);
router.get("/", getUsers);
router.post("/", createUser);
router.put("/change-password", changePassword);
router.put("/reset-password", resetPassword);
router.put("/archive/:id", archiveUser);
router.put("/unarchive/:id", unarchiveUser);
router.post("/forgot-password", forgotPassword);
router.post("/lock/:id", lockUser);
router.post("/unlock/:id", unlockUser);
router.get("/locks/stream", streamUserLocks);
router.put("/:id", updateUser);

export default router;
