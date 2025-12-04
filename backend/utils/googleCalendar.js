import fs from "fs";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------
// PATHS FOR CREDENTIAL + TOKEN
// ------------------------------
const CREDENTIALS_PATH = path.resolve("credentials/calendar_credentials.json");
const TOKEN_PATH = path.resolve("credentials/calendar_token.json");

// ------------------------------
// LOAD GOOGLE CREDENTIALS.JSON
// ------------------------------
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("❌ ERROR: Missing credentials/calendar_credentials.json");
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

const { client_id, client_secret, redirect_uris } =
  credentials.web || credentials.installed;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// ------------------------------
// LOAD TOKEN IF EXISTS
// ------------------------------
if (fs.existsSync(TOKEN_PATH)) {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(token);
  console.log("📌 Google Calendar token loaded");
} else {
  console.log("⚠️ No Google Calendar token found — connect via /api/calendar/auth");
}

// ------------------------------
// 1. Generate Authorization URL
// ------------------------------
export const generateAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
};

// ------------------------------
// 2. Save Google OAuth Token
// ------------------------------
export const saveToken = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  oauth2Client.setCredentials(tokens);

  console.log("✅ Google Calendar token saved");
  return "Google Calendar connected successfully!";
};

// ------------------------------
// 3. Create a Calendar Event
// ------------------------------
export const createCalendarEvent = async (eventData) => {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: eventData.calendarId || "2301101641@student.buksu.edu.ph",
    requestBody: {
      id: eventData.id, // prevent duplicates
      summary: eventData.summary,
      description: eventData.description,
      start: eventData.start,
      end: eventData.end,
    },
  });

  return response.data;
};


// 4. List Calendar Events
export const listCalendarEvents = async () => {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: "2301101641@student.buksu.edu.ph",
    maxResults: 50,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: new Date("2024-01-01").toISOString(), // fetch recent alerts only
  });

  return response.data.items || [];
};


export default {
  generateAuthUrl,
  saveToken,
  createCalendarEvent,
  listCalendarEvents,
};

export { oauth2Client };
