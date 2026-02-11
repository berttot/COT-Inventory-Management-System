/**
 * Centralized API configuration for COT Inventory System.
 * Use REACT_APP_API_URL in .env for production deployment.
 */
export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
export const API_URL = `${API_BASE}/api`;
