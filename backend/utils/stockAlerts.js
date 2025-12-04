// utils/stockAlerts.js
import { google } from "googleapis";
import { oauth2Client, createCalendarEvent } from "./googleCalendar.js";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "2301101641@student.buksu.edu.ph";

/* ------------------------------------------------------
   1. COMPUTE STATUS FROM QUANTITY
------------------------------------------------------ */
export const computeStatus = (quantity) => {
  const q = Number(quantity) || 0;
  if (q <= 0) return "Out of Stock";
  if (q <= 10) return "Limited";
  return "Available";
};

/* ------------------------------------------------------
   2. CREATE RESTOCK EVENT
------------------------------------------------------ */
export async function maybeCreateRestockEvent(item, prevQty, newQty) {
  try {
    const prevStatus = computeStatus(prevQty);
    const newStatus = computeStatus(newQty);

    if (newStatus === "Available" && prevStatus !== "Available") {
      console.log(">> RESTOCK EVENT TRIGGERED <<");

      const restockTag = `restock-${item._id}`.toLowerCase();
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // prevent duplicates
      const exists = await calendar.events.list({
        calendarId: CALENDAR_ID,
        privateExtendedProperty: `restockId=${restockTag}`,
        maxResults: 1,
      });

      if (exists.data.items.length > 0) {
        console.log("⚠ Restock event already exists, skipping");
        return;
      }

      const summary = `RESTOCKED: ${item.name}`;
      const description = [
        `Item: ${item.name}`,
        `Category: ${item.category}`,
        `Unit: ${item.unit}`,
        `Prev Qty: ${prevQty}`,
        `New Qty: ${newQty}`,
        `Status: ${prevStatus} → ${newStatus}`,
        `Item ID: ${item._id}`,
      ].join("\n");

      const now = new Date();
      const later = new Date(now.getTime() + 60 * 60 * 1000);

      await createCalendarEvent({
        calendarId: CALENDAR_ID,
        summary,
        description,
        start: { dateTime: now.toISOString() },
        end: { dateTime: later.toISOString() },
        colorId: "10", // green
        extendedProperties: {
          private: {
            restockId: restockTag,
            itemId: String(item._id),
          },
        },
      });

      console.log("🎉 RESTOCK event created!");

      await deleteOldAlerts(item._id, "restock");
    }
  } catch (err) {
    console.error("❌ RESTOCK error:", err.message);
  }
}

/* ------------------------------------------------------
   3. CREATE LOW-STOCK / OUT-OF-STOCK EVENT
------------------------------------------------------ */
export async function maybeCreateLowStockEvent(item, prevQty, newQty) {
  try {
    const prevStatus = computeStatus(prevQty);
    const newStatus = computeStatus(newQty);

    if (prevStatus !== newStatus && (newStatus === "Limited" || newStatus === "Out of Stock")) {
      console.log(">> LOW-STOCK/OOS EVENT TRIGGERED <<");

      const alertTag = `item-${item._id}-${newStatus}`.toLowerCase();
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // check duplicates
      const exists = await calendar.events.list({
        calendarId: CALENDAR_ID,
        privateExtendedProperty: `alertId=${alertTag}`,
        maxResults: 1,
      });

      if (exists.data.items.length > 0) {
        console.log("⚠ Low-stock alert already exists, skipping");
        return;
      }

      const summary =
        newStatus === "Out of Stock"
          ? `OUT OF STOCK: ${item.name}`
          : `LOW STOCK: ${item.name}`;

      const description = [
        `Item: ${item.name}`,
        `Category: ${item.category}`,
        `Unit: ${item.unit}`,
        `Prev Qty: ${prevQty}`,
        `New Qty: ${newQty}`,
        `Status: ${prevStatus} → ${newStatus}`,
        `Item ID: ${item._id}`,
      ].join("\n");

      const now = new Date();
      const later = new Date(now.getTime() + 60 * 60 * 1000);

      await createCalendarEvent({
        calendarId: CALENDAR_ID,
        summary,
        description,
        start: { dateTime: now.toISOString() },
        end: { dateTime: later.toISOString() },
        colorId: newStatus === "Out of Stock" ? "11" : "6",
        extendedProperties: {
          private: {
            alertId: alertTag,
            itemId: String(item._id),
          },
        },
      });

      console.log("🎉 LOW-STOCK or OOS event created!");

      await deleteOldAlerts(item._id, newStatus === "Out of Stock" ? "outofstock" : "lowstock");
    }
  } catch (err) {
    console.error("❌ Low-stock error:", err.message);
  }
}

/* ------------------------------------------------------
   4. AUTO-CLEAN OUTDATED EVENTS
------------------------------------------------------ */
export async function deleteOldAlerts(itemId, keepType) {
  try {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      privateExtendedProperty: `itemId=${itemId}`,
      maxResults: 50,
    });

    const events = res.data.items || [];

    for (const ev of events) {
      const tag = ev.extendedProperties?.private;
      if (!tag) continue;

      const isRestock = tag.restockId;
      const isLow = tag.alertId?.includes("limited");
      const isOut = tag.alertId?.includes("out of stock");

      let outdated = false;

      if (keepType === "restock" && (isLow || isOut)) outdated = true;
      if (keepType === "lowstock" && (isRestock || isOut)) outdated = true;
      if (keepType === "outofstock" && (isRestock || isLow)) outdated = true;

      if (outdated) {
        console.log("🗑 Removing outdated alert:", ev.summary);
        await calendar.events.delete({
          calendarId: CALENDAR_ID,
          eventId: ev.id,
        });
      }
    }

    console.log("✔ Outdated alerts cleaned");
  } catch (err) {
    console.error("❌ Cleanup error:", err.message);
  }
}
