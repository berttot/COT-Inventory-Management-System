// utils/getWorldTime.js
import fetch from "node-fetch";

export async function getWorldTime() {
  try {
    const res = await fetch(
      "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Manila",
      { timeout: 5000 }
    );

    if (!res.ok) {
      throw new Error("World Time API returned " + res.status);
    }

    const data = await res.json();

    if (data.dateTime) {
      return new Date(data.dateTime);
    } else {
      throw new Error("Missing dateTime field");
    }

  } catch (err) {
    console.error("⚠ World Time API failed:", err.message);
    return new Date(); // fallback
  }
}
