import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/UserModel.js";

dotenv.config();

//  Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

const hashExistingPasswords = async () => {
  try {
    const users = await User.find();

    for (const user of users) {
      // Skip users missing required fields
      if (!user.email || !user.accessID || !user.name || !user.password) {
        console.warn(`Skipping user with missing data: ${user._id}`);
        continue;
      }

      //  Hash only if not already hashed
      if (!user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;
        await user.save({ validateBeforeSave: false }); // ✅ prevents revalidation errors
        console.log(` Updated password for user: ${user.name} (${user.accessID})`);
      }
    }

    console.log(" All plain-text passwords have been hashed.");
    mongoose.connection.close();
  } catch (err) {
    console.error(" Error hashing passwords:", err);
    mongoose.connection.close();
  }
};

hashExistingPasswords();
