import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthData } from "../utils/auth";

/**
 * Global component that intercepts fetch errors and handles server-down scenarios
 * Wraps the app to automatically detect when server is terminated/unreachable
 */
export default function ServerErrorHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch globally to intercept errors
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);

        // Check for server errors (status 0 = network error, 500+ = server error)
        // But don't auto-logout for 401/403 (those are handled by api.js)
        if (
          response.status === 0 ||
          (response.status >= 500 && response.status !== 401 && response.status !== 403)
        ) {
          // Only auto-logout if user is authenticated
          const token = localStorage.getItem("token");
          if (token) {
            console.warn("⚠️ Server error detected. Auto-logging out...");
            clearAuthData();
            if (window.location.pathname !== "/") {
              navigate("/", { replace: true });
            }
          }
        }

        return response;
      } catch (error) {
        // Check if it's a network/server error
        const isNetworkError =
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("NetworkError") ||
          error.message?.includes("Network request failed") ||
          error.name === "TypeError" ||
          error.code === "ECONNREFUSED" ||
          error.code === "ERR_NETWORK";

        if (isNetworkError) {
          // Only auto-logout if user is authenticated
          const token = localStorage.getItem("token");
          if (token) {
            console.warn("⚠️ Server connection lost. Auto-logging out...");
            clearAuthData();
            if (window.location.pathname !== "/") {
              navigate("/", { replace: true });
            }
          }
        }

        // Re-throw the error so components can handle it
        throw error;
      }
    };

    // Cleanup: restore original fetch on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, [navigate]);

  // This component doesn't render anything
  return null;
}
