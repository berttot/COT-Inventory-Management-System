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
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Canceled",
        // Legacy statuses kept for backward compatibility.
        "Successful",
        "Unsuccessful",
      ],
      required: true,
      default: "Pending",
    },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "" },
    canceledAt: { type: Date, default: null },
    canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Request", RequestSchema);
