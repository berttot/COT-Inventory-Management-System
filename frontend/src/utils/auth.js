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
