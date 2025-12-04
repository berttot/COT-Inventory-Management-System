import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";  // Using db.js
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import inviteRoute from "./routes/inviteRoute.js";
import itemRoutes from "./routes/itemRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import superAdminReportRoutes from "./routes/superAdminReportRoutes.js";
import googleCalendarRoutes from "./routes/googleCalendarRoutes.js";
import logsRoutes from "./routes/logsRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

dotenv.config();

//  Connect to MongoDB
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

//  API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/invite", inviteRoute);
app.use("/api/items", itemRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reports/superadmin", superAdminReportRoutes);
app.use("/api/calendar", googleCalendarRoutes);
app.use("/api/logs", logsRoutes);

app.use(notFound);
app.use(errorHandler);

// req.ip will return a real IP when deployed.
// app.set('trust proxy', true);


//  Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
