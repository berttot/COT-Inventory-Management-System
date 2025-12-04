import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Available", "Limited", "Out of Stock"],
      default: "Available",
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    // 🔐 REQUIRED FOR 2PL LOCKING
    lockedBy: {
      type: String,
      default: null,  // userId
    },
    lockExpiresAt: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

export default Item;
