import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Request from "../models/RequestModel.js";

dotenv.config();

const migrateStatuses = async () => {
  try {
    await connectDB();

    const successfulResult = await Request.updateMany(
      { status: "Successful" },
      {
        $set: {
          status: "Approved",
          approvedAt: new Date(),
        },
      }
    );

    const unsuccessfulResult = await Request.updateMany(
      { status: "Unsuccessful" },
      {
        $set: {
          status: "Rejected",
          rejectedAt: new Date(),
          rejectionReason: "Migrated from legacy unsuccessful status.",
        },
      }
    );

    console.log("Migration completed.");
    console.log(`Successful -> Approved: ${successfulResult.modifiedCount}`);
    console.log(`Unsuccessful -> Rejected: ${unsuccessfulResult.modifiedCount}`);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

migrateStatuses();
