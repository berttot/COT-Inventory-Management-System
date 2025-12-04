import express from "express";
import {
  archiveItem,
  createItem,
  getItems,
  restockItem,
  unarchiveItem,
  updateItem,
} from "../controllers/itemController.js";

const router = express.Router();

router.route("/").get(getItems).post(createItem);
router.put("/:id", updateItem);
router.put("/restock/:id", restockItem);
router.put("/archive/:id", archiveItem);
router.put("/unarchive/:id", unarchiveItem);

export default router;
