/**
 * Centralized authentication utilities
 * Provides consistent logout and auth state management
 */

import { API_URL } from "../config/api";

/**
 * Clears all authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("role");
  localStorage.removeItem("department");
};

/**
 * Checks if user is currently authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  return !!(token && role);
};

/**
 * Gets current user role
 */
export const getCurrentRole = () => {
  return localStorage.getItem("role");
};

/**
 * Gets current auth token
 */
export const getAuthToken = () => {
  return localStorage.getItem("token");
};

const LOGOUT_BEACON_DEDUPE_MS = 5000;
const LOGOUT_BEACON_LAST_SENT_KEY = "logoutBeaconLastSentAt";

const canSendLogoutBeacon = () => {
  const lastSentRaw = sessionStorage.getItem(LOGOUT_BEACON_LAST_SENT_KEY);
  const lastSent = Number(lastSentRaw || 0);
  const now = Date.now();
  if (now - lastSent < LOGOUT_BEACON_DEDUPE_MS) {
    return false;
  }
  sessionStorage.setItem(LOGOUT_BEACON_LAST_SENT_KEY, String(now));
  return true;
};

const buildLogoutExitPayload = (details) => {
  return {
    details,
    token: localStorage.getItem("token") || "",
    userName: localStorage.getItem("userName") || "",
    role: localStorage.getItem("role") || "",
    source: "beacon",
  };
};

/**
 * Best-effort logout log for unload scenarios (refresh/tab close)
 * Uses navigator.sendBeacon so the browser can transmit during page teardown.
 */
export const sendLogoutBeacon = (
  details = "Browser session ended (refresh/tab close)"
) => {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  if (typeof navigator.sendBeacon !== "function") {
    return false;
  }

  if (!canSendLogoutBeacon()) {
    return false;
  }

  const payload = buildLogoutExitPayload(details);

  try {
    // Send explicit form content type so Express urlencoded parser can read it.
    const encoded = new URLSearchParams(payload).toString();
    const body = new Blob([encoded], {
      type: "application/x-www-form-urlencoded;charset=UTF-8",
    });
    const ok = navigator.sendBeacon(`${API_URL}/logs/logout`, body);

    // Fallback for browsers where beacon may be blocked in this context.
    if (!ok && payload.token && typeof fetch === "function") {
      fetch(`${API_URL}/logs/logout`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${payload.token}`,
        },
        body: JSON.stringify({ details, source: "keepalive" }),
      }).catch(() => {});
    }

    return ok;
  } catch {
    return false;
  }
};

/**
 * Centralized logout function
 * Clears all auth data and optionally records logout on server
 * @param {Object} options - Logout options
 * @param {boolean} options.recordLogout - Whether to record logout on server (default: true)
 * @param {string} options.details - Details to log (default: "User signed out via UI")
 * @param {Function} options.onComplete - Callback after logout completes
 */
export const logout = async (options = {}) => {
  const {
    recordLogout = true,
    details = "User signed out via UI",
    onComplete,
  } = options;

  // Try to record logout on server (but don't fail if server is down)
  if (recordLogout) {
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/logs/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ details }),
      });
    } catch (err) {
      // Silently fail - server might be down, which is fine for logout
      console.warn("Failed to record logout on server:", err.message);
    }
  }

  // Always clear local auth data
  clearAuthData();

  // Call completion callback if provided
  if (onComplete) {
    onComplete();
  }
};
