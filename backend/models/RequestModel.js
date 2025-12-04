import mongoose from "mongoose";

const RequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: { type: String, required: true }, // keep this for display
    department: { type: String, required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["Successful", "Unsuccessful"], required: true },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Request", RequestSchema);
