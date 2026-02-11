import { google } from "googleapis";
import { oauth2Client, generateAuthUrl, saveToken, createCalendarEvent, listCalendarEvents } from "../utils/googleCalendar.js";
import Item from "../models/ItemModel.js";
import asyncHandler from "../middleware/asyncHandler.js";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "2301101641@student.buksu.edu.ph";

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
    calendarId: CALENDAR_ID,
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

/**
 * Combined endpoint: active stock alerts (from DB) + recent calendar events.
 * Super admin gets a single call for the Calendar Alerts dashboard.
 * Calendar events are optional — if Google Calendar fails, we still return active stock.
 * Uses quantity-based filtering (not status) to ensure accuracy.
 */
export const getAlertSummary = asyncHandler(async (req, res) => {
  // 1. Active stock alerts: items with qty <= 0 (out) or 1–10 (low).
  //    Quantity is source of truth; status field can be stale.
  //    Optionally include archived items (e.g. ?includeArchived=true).
  const includeArchived = req.query.includeArchived === "true";
  const alertQuery = {
    $or: [
      { quantity: { $lte: 0 } },
      { quantity: { $gte: 1, $lte: 10 } },
    ],
  };
  if (!includeArchived) {
    alertQuery.isArchived = false;
  }
  const activeAlerts = await Item.find(alertQuery)
    .sort({ quantity: 1, name: 1 }) // Out of stock (0) first, then low stock
    .lean();

  // Normalize status from quantity for frontend (align with stockAlerts.js logic)
  activeAlerts.forEach((item) => {
    const q = Number(item.quantity) || 0;
    item.status = q <= 0 ? "Out of Stock" : q <= 10 ? "Limited" : "Available";
  });

  // 2. Recent calendar events (LOW STOCK, OUT OF STOCK, RESTOCKED)
  let recentEvents = [];
  try {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: thirtyDaysAgo.toISOString(),
    });

    const items = response.data.items || [];
    recentEvents = items
      .filter(
        (e) =>
          e.summary?.startsWith("LOW STOCK:") ||
          e.summary?.startsWith("OUT OF STOCK:") ||
          e.summary?.startsWith("RESTOCKED:")
      )
      .sort((a, b) => {
        const da = a.start?.dateTime || a.start?.date || 0;
        const db = b.start?.dateTime || b.start?.date || 0;
        return new Date(db) - new Date(da); // newest first
      });
  } catch (err) {
    console.warn("Calendar events unavailable:", err.message);
    // Still return activeAlerts — page remains useful
  }

  res.json({
    success: true,
    activeAlerts,
    recentEvents,
  });
});

/**
 * Lightweight endpoint for notification badge (counts only).
 * Used by NotificationBell for polling without fetching full alert list.
 */
export const getAlertCount = asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  const alertQuery = {
    $or: [
      { quantity: { $lte: 0 } },
      { quantity: { $gte: 1, $lte: 10 } },
    ],
  };
  if (!includeArchived) alertQuery.isArchived = false;

  const items = await Item.find(alertQuery).select("quantity").lean();
  let outOfStock = 0;
  let lowStock = 0;
  items.forEach((item) => {
    const q = Number(item.quantity) || 0;
    if (q <= 0) outOfStock++;
    else lowStock++;
  });

  res.json({
    success: true,
    outOfStock,
    lowStock,
    total: outOfStock + lowStock,
  });
});

export const debugEvents = asyncHandler(async (req, res) => {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    maxResults: 50,
    orderBy: "updated",
    singleEvents: true,
  });

  res.json(response.data.items);
});

