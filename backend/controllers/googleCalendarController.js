import { google } from "googleapis";
import { oauth2Client, generateAuthUrl, saveToken, createCalendarEvent, listCalendarEvents } from "../utils/googleCalendar.js";
import asyncHandler from "../middleware/asyncHandler.js";

export const getAuthPage = (req, res) => {
  const url = generateAuthUrl();
  res.send(`
    <h2>Google Calendar Authorization</h2>
    <p>Click the link below to authorize:</p>
    <a href="${url}" target="_blank">Authorize Google Calendar</a>
  `);
};

export const handleCallback = asyncHandler(async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.status(400);
    throw new Error("No authorization code provided");
  }

  const message = await saveToken(code);
  res.send(`<h2>${message}</h2><p>You may now close this tab.</p>`);
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await createCalendarEvent(req.body);
  res.json({
    success: true,
    message: "Event successfully created!",
    event,
  });
});

export const getStockEvents = asyncHandler(async (req, res) => {
  const events = await listCalendarEvents();
  const filtered = events.filter((event) =>
    event.summary?.startsWith("LOW STOCK:") ||
    event.summary?.startsWith("OUT OF STOCK:")
  );
  res.json({ success: true, events: filtered });
});

export const getAlerts = asyncHandler(async (req, res) => {
  const itemId = req.query.itemId || null;
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    maxResults: 200,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: new Date("2024-01-01").toISOString(),
  });

  let events = response.data.items || [];
  events = events.filter((event) =>
    event.summary?.startsWith("LOW STOCK:") ||
    event.summary?.startsWith("OUT OF STOCK:") ||
    event.summary?.startsWith("RESTOCKED:")
  );

  if (itemId) {
    events = events.filter(
      (event) => event.extendedProperties?.private?.itemId === itemId
    );
  }

  res.json({ success: true, events });
});

export const debugEvents = asyncHandler(async (req, res) => {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    maxResults: 50,
    orderBy: "updated",
    singleEvents: true,
  });

  res.json(response.data.items);
});

