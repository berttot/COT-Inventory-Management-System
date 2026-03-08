/**
 * Centralized API utility with auto-logout on server errors
 * Detects when server is down/terminated and automatically logs out user
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
 * Checks if an error indicates the server is down/unreachable
 */
const isServerUnreachable = (error) => {
  if (!error) return false;

  // Network errors (server not running, connection refused, etc.)
  if (
    error.message?.includes("Failed to fetch") ||
    error.message?.includes("NetworkError") ||
    error.message?.includes("Network request failed") ||
    error.name === "TypeError" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ERR_NETWORK"
  ) {
    return true;
  }

  return false;
};

/**
 * Checks if a response status indicates server is down
 */
const isServerError = (status) => {
  // 500+ errors might indicate server issues, but we'll be more conservative
  // Only treat connection errors as "server down"
  return status === 0 || status >= 500;
};

/**
 * Auto-logout handler - redirects to login page
 */
const handleAutoLogout = (reason = "Server connection lost") => {
  clearAuthData();
  
  // Show a brief message if possible (optional - you can remove if you prefer silent logout)
  console.warn(`⚠️ ${reason}. Auto-logging out...`);
  
  // Redirect to login page
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
};

/**
 * Enhanced fetch wrapper that:
 * 1. Automatically adds Authorization header if token exists
 * 2. Detects server errors and auto-logs out
 * 3. Provides consistent error handling
 */
export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  
  // Build headers
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Add auth token if available
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Merge options
  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);

    // Check if server is unreachable (status 0 usually means network error)
    if (response.status === 0 || (!response.ok && response.status >= 500)) {
      // Don't auto-logout for 401/403 (those are auth errors, handled separately)
      if (response.status !== 401 && response.status !== 403) {
        handleAutoLogout("Server is unreachable or experiencing issues");
        throw new Error("Server connection failed");
      }
    }

    // Handle 401 Unauthorized (token expired/invalid)
    if (response.status === 401) {
      clearAuthData();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
      throw new Error("Session expired. Please log in again.");
    }

    return response;
  } catch (error) {
    // Check if it's a network/server error
    if (isServerUnreachable(error)) {
      handleAutoLogout("Server connection lost");
      throw new Error("Server is unreachable. Please check your connection or contact support.");
    }

    // Re-throw other errors
    throw error;
  }
};

/**
 * Convenience method for GET requests
 */
export const apiGet = (endpoint, options = {}) => {
  return apiFetch(endpoint, { ...options, method: "GET" });
};

/**
 * Convenience method for POST requests
 */
export const apiPost = (endpoint, body, options = {}) => {
  return apiFetch(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
};

/**
 * Convenience method for PUT requests
 */
export const apiPut = (endpoint, body, options = {}) => {
  return apiFetch(endpoint, {
    ...options,
    method: "PUT",
    body: JSON.stringify(body),
  });
};

/**
 * Convenience method for DELETE requests
 */
export const apiDelete = (endpoint, options = {}) => {
  return apiFetch(endpoint, { ...options, method: "DELETE" });
};
