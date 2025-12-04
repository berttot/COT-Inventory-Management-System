import mongoose from "mongoose";
import dotenv from "dotenv";
import Item from "../models/ItemModel.js";
import itemsData from "./itemsData.js";

dotenv.config();

const seedItems = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Item.deleteMany();
    await Item.insertMany(itemsData);
    console.log("✅ Items seeded successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding items:", err);
    process.exit(1);
  }
};

seedItems();
