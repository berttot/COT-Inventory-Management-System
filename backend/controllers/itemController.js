import mongoose from "mongoose";
import Item from "../models/ItemModel.js";
import {
  computeStatus,
  maybeCreateLowStockEvent,
  maybeCreateRestockEvent,
} from "../utils/stockAlerts.js";
import asyncHandler from "../middleware/asyncHandler.js";

export const getItems = asyncHandler(async (req, res) => {
  const { search = "", category, archived } = req.query;
  const query = {
    isArchived: archived === "true",
  };

  if (search) {
    query.name = { $regex: search.trim(), $options: "i" };
  }

  if (category && category !== "All") {
    query.category = category;
  }

  const items = await Item.find(query).sort({ name: 1 });
  res.json(items);
});

export const createItem = asyncHandler(async (req, res) => {
  const { name, category, unit, quantity } = req.body;
  if (!name || !category || !unit || quantity === undefined) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const existing = await Item.findOne({ name: name.trim(), category });
  if (existing) {
    res.status(400);
    throw new Error("Item already exists");
  }

  const qty = Number(quantity) || 0;
  const newItem = await Item.create({
    name: name.trim(),
    category,
    unit,
    quantity: qty,
    status: computeStatus(qty),
  });

  res.status(201).json(newItem);
});

export const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid item id");
  }

  const item = await Item.findById(id);
  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  const prevQty = Number(item.quantity) || 0;
  const updates = {};
  const { name, category, unit, quantity } = req.body;

  if (name !== undefined) updates.name = name.trim();
  if (category !== undefined) updates.category = category;
  if (unit !== undefined) updates.unit = unit;
  if (quantity !== undefined) {
    updates.quantity = Number(quantity);
    updates.status = computeStatus(updates.quantity);
  }

  const updated = await Item.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    res.status(404);
    throw new Error("Item not found");
  }

  if (updates.quantity !== undefined) {
    await maybeCreateLowStockEvent(item, prevQty, updates.quantity);
    await maybeCreateRestockEvent(item, prevQty, updates.quantity);
  }

  res.json(updated);
});

export const restockItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid item id");
  }

  const { addQuantity, setQuantity } = req.body;
  const item = await Item.findById(id);

  if (!item) {
    res.status(404);
    throw new Error("Item not found");
  }

  const prevQty = Number(item.quantity) || 0;

  if (setQuantity !== undefined) {
    item.quantity = Number(setQuantity);
  } else if (addQuantity !== undefined) {
    item.quantity = Number(item.quantity) + Number(addQuantity);
  } else {
    res.status(400);
    throw new Error("Provide addQuantity or setQuantity");
  }

  item.status = computeStatus(item.quantity);
  await item.save();

  await maybeCreateLowStockEvent(item, prevQty, item.quantity);
  await maybeCreateRestockEvent(item, prevQty, item.quantity);

  res.json(item);
});

export const archiveItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid item id");
  }

  const updated = await Item.findByIdAndUpdate(
    id,
    { isArchived: true },
    { new: true }
  );

  if (!updated) {
    res.status(404);
    throw new Error("Item not found");
  }

  res.json({ message: "Item archived", item: updated });
});

export const unarchiveItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid item id");
  }

  const updated = await Item.findByIdAndUpdate(
    id,
    { isArchived: false },
    { new: true }
  );

  if (!updated) {
    res.status(404);
    throw new Error("Item not found");
  }

  res.json({ message: "Item restored", item: updated });
});

