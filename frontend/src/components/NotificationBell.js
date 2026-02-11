import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { Bell, AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { API_URL, API_BASE } from "../config/api";

const POLL_INTERVAL_MS = 120000; // 2 minutes fallback

/**
 * Real-time notification bell for Super Admin
 * - Shows live stock alert counts via Socket.io
 * - Dropdown displays top 5 active alerts
 * - Falls back to polling if socket disconnects
 */
const NotificationBell = () => {
  const [count, setCount] = useState({ total: 0, outOfStock: 0, lowStock: 0 });
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, bottom: 0 });

  const fetchCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/calendar/alert-count`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        setCount({
          total: data.total ?? 0,
          outOfStock: data.outOfStock ?? 0,
          lowStock: data.lowStock ?? 0,
        });
      }
    } catch (error) {
      console.warn("Failed to fetch alert count:", error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/calendar/alert-summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setAlerts(data.activeAlerts || []);
    } catch (error) {
      console.warn("Failed to fetch alerts:", error);
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // Socket.io connection and polling
  useEffect(() => {
    fetchCount();

    socketRef.current = io(API_BASE, { autoConnect: true });

    socketRef.current.on("stock-alerts", (payload) => {
      setCount({
        total: payload.total ?? 0,
        outOfStock: payload.outOfStock ?? 0,
        lowStock: payload.lowStock ?? 0,
      });
    });

    const pollInterval = setInterval(fetchCount, POLL_INTERVAL_MS);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(pollInterval);
    };
  }, [fetchCount]);

  // Fetch alerts when dropdown opens
  useEffect(() => {
    if (open) fetchAlerts();
  }, [open, fetchAlerts]);

  const updateDropdownPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();

    // Align horizontally to the button center, clamped to viewport so it won't overflow.
    const dropdownWidth = 288; // w-72 (18rem) in px
    const half = dropdownWidth / 2;
    const centerX = rect.left + rect.width / 2;
    const clampedLeft = Math.min(
      window.innerWidth - 8 - half,
      Math.max(8 + half, centerX)
    );

    // Position above the button with an 8px gap.
    const bottom = window.innerHeight - rect.top + 8;
    setDropdownPos({ left: clampedLeft, bottom });
  }, []);

  // Keep dropdown anchored when open (resize/scroll of any container).
  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();

    const handle = () => updateDropdownPosition();
    window.addEventListener("resize", handle);
    // scroll doesn't bubble; capture=true catches scroll on nested containers too
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, updateDropdownPosition]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inBell = containerRef.current && containerRef.current.contains(e.target);
      const inDropdown =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inBell && !inDropdown) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 text-white rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label={`Stock alerts${count.total > 0 ? ` (${count.total})` : ""}`}
      >
        <Bell size={20} strokeWidth={2} />
        {count.total > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {count.total > 99 ? "99+" : count.total}
          </span>
        )}
      </button>

      {open && (
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-72 max-h-96 flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 animate-in slide-in-from-bottom-2 duration-200"
            style={{
              left: dropdownPos.left,
              bottom: dropdownPos.bottom,
              transform: "translateX(-50%)",
            }}
            role="dialog"
            aria-label="Stock alerts"
          >
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#0a2a66] to-[#002B7F] px-4 py-3 text-white shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Stock Alerts</h3>
                {count.total > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {count.total}
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 mt-1">
                {count.total === 0
                  ? "No active alerts"
                  : `${count.outOfStock} out of stock · ${count.lowStock} low stock`}
              </p>
            </div>

            <div
              className="overflow-y-auto flex-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 #f1f5f9",
              }}
            >
              {loadingAlerts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0a2a66] border-t-transparent" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {count.total === 0
                    ? "All items are in good stock."
                    : "No alerts to display."}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {alerts.slice(0, 5).map((item) => (
                    <li
                      key={item._id}
                      className="px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                            item.status === "Out of Stock"
                              ? "bg-red-50"
                              : "bg-amber-50"
                          }`}
                        >
                          {item.status === "Out of Stock" ? (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.category}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Qty: {item.quantity} {item.unit}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {alerts.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-2 shrink-0">
                <Link
                  to="/super-admin/calendar-alerts"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#0a2a66] hover:bg-white hover:shadow-sm transition-all"
                >
                  View all alerts
                  <ChevronRight size={14} />
                </Link>
              </div>
            )}
            {/* Arrow pointing down to button */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 ring-1 ring-black/10" />
          </div>,
          document.body
        )
      )}
    </div>
  );
};

export default NotificationBell;
