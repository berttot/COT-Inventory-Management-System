import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  accessID: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ["superadmin", "departmentadmin", "staff"], 
    default: "staff" 
  },
  department: {
    type: String,
    enum: [
      "Information Technology",
      "Automotive Technology",
      "Electronics Technology",
      "EMC"
    ],
    default: "Information Technology"
  },
  password: { type: String, required: true },

  isArchived: { type: Boolean, default: false },

   // 🔒 2PL lock fields
  lockedBy: { type: String, default: null },
  lockExpiresAt: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);
export default User;
