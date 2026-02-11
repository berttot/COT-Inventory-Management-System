import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL, API_BASE } from "../../config/api";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Package,
  UserCog,
  LogOut,
  ChevronUp,
  ChevronDown,
  Calendar,
  Archive,
  FileText,
  Settings,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import NotificationBell from "../../components/NotificationBell";

const CalendarAlerts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("userName");
    if (stored) setUserName(stored);
  }, []);

  const fetchAlertSummary = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/calendar/alert-summary${includeArchived ? "?includeArchived=true" : ""}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load alerts");
      setActiveAlerts(data.activeAlerts || []);
      setRecentEvents(data.recentEvents || []);
    } catch (err) {
      setError(err.message);
      setActiveAlerts([]);
      setRecentEvents([]);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchAlertSummary();
  }, [includeArchived]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = io(API_BASE, { autoConnect: true });
    
    const handleStockAlerts = () => {
      fetchAlertSummary();
    };

    socket.on("stock-alerts", handleStockAlerts);

    return () => {
      socket.off("stock-alerts", handleStockAlerts);
      socket.disconnect();
    };
  }, [fetchAlertSummary]);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/logs/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ details: "User signed out via UI" }),
      });
    } catch (err) {
      console.warn("Failed to record logout:", err);
    } finally {
      localStorage.removeItem("token");
      setTimeout(() => {
        setLogoutLoading(false);
        navigate("/");
      }, 300);
    }
  };

  const outOfStock = activeAlerts.filter((a) => a.status === "Out of Stock");
  const lowStock = activeAlerts.filter((a) => a.status === "Limited");

  const formatEventDate = (event) => {
    const dt = event.start?.dateTime || event.start?.date;
    if (!dt) return "Unknown";
    const d = new Date(dt);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return `Today, ${d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const getEventIcon = (summary) => {
    if (summary?.startsWith("OUT OF STOCK")) return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
    if (summary?.startsWith("LOW STOCK")) return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
    if (summary?.startsWith("RESTOCKED")) return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    return <Calendar className="w-5 h-5 text-gray-500 shrink-0" />;
  };

  const getEventBadgeClass = (summary) => {
    if (summary?.startsWith("OUT OF STOCK")) return "bg-red-100 text-red-700";
    if (summary?.startsWith("LOW STOCK")) return "bg-amber-100 text-amber-700";
    if (summary?.startsWith("RESTOCKED")) return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Super Admin Portal</p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link to="/super-admin/requests" className={getLinkClass("/super-admin/requests")}>
              <ClipboardList size={18} /> Request Log
            </Link>
            <Link to="/super-admin/manage-inventory" className={getLinkClass("/super-admin/manage-inventory")}>
              <Package size={18} /> Manage Inventory
            </Link>
            <Link to="/super-admin/calendar-alerts" className={getLinkClass("/super-admin/calendar-alerts")}>
              <Calendar size={18} /> Calendar Alerts
            </Link>
            <Link to="/super-admin/archived-records" className={getLinkClass("/super-admin/archived-records")}>
              <Archive size={18} /> Archived Records
            </Link>
            <Link to="/super-admin/system-logs" className={getLinkClass("/super-admin/system-logs")}>
              <FileText size={18} /> System Logs
            </Link>
          </nav>
        </div>

        {/* Notification Section */}
        <div className="px-6 py-3 border-t border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Notifications</span>
            <NotificationBell />
          </div>
        </div>

        <div className="p-5 border-t border-white/20 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">College of Technology</p>
              </div>
            </div>
            <button onClick={() => setShowLogout(!showLogout)} className="p-1 rounded hover:bg-white/10 transition">
              {showLogout ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {showLogout && (
            <div className="mt-4 w-full max-w-[220px] flex flex-col gap-2">
              <button
                onClick={() => navigate("/super-admin/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2"
              >
                <Settings size={16} /> Settings
              </button>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={`w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                  ${logoutLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#f97316] hover:bg-orange-600 text-white"}`}
              >
                <LogOut size={16} />
                {logoutLoading ? "Logging out..." : "Log Out"}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66] mb-2">Calendar Alerts</h1>
            <p className="text-gray-600">
              Active stock alerts and recent activity. Get notified when items are low, out of stock, or restocked.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include archived items
            </label>
            <button
              onClick={fetchAlertSummary}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0a2a66] text-white rounded-lg hover:bg-[#082554] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-10 h-10 text-[#0a2a66] animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            <p className="font-medium">Failed to load alerts</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
                    <p className="text-xs text-gray-500">Items need immediate restock</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-2xl font-bold text-amber-600">{lowStock.length}</p>
                    <p className="text-xs text-gray-500">Items at or below 10 units</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Alerts - Items needing attention */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-[#0a2a66] mb-4">Active Stock Alerts</h2>
              {activeAlerts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium">All items are in good stock</p>
                  <p className="text-sm mt-1">No items are currently low or out of stock.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeAlerts.map((item) => (
                    <div
                      key={item._id}
                      className={`flex items-center justify-between gap-4 p-4 rounded-xl shadow-sm border ${
                        item.status === "Out of Stock" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {item.status === "Out of Stock" ? (
                          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                            {item.name}
                            {item.isArchived && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600 shrink-0">Archived</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.category} • {item.quantity} {item.unit}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/super-admin/manage-inventory"
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a2a66] text-white rounded-lg hover:bg-[#082554] transition shrink-0"
                      >
                        <ExternalLink size={16} />
                        Manage
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Activity - Calendar events */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-[#0a2a66] mb-4">Recent Activity (Last 30 Days)</h2>
              {recentEvents.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No recent events</p>
                  <p className="text-sm mt-1">Stock change events will appear here once Google Calendar is connected.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <ul className="divide-y divide-gray-100">
                    {recentEvents.slice(0, 20).map((event, i) => (
                      <li key={event.id || i} className="flex items-start gap-4 p-4 hover:bg-gray-50/50">
                        {getEventIcon(event.summary)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{event.summary}</p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 shrink-0">{formatEventDate(event)}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${getEventBadgeClass(event.summary)}`}>
                          {event.summary?.split(":")[0] || "Event"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Collapsible Google Calendar Embed */}
            <section>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 text-[#0a2a66] font-semibold hover:underline mb-3"
              >
                {showCalendar ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                Google Calendar Embed
              </button>
              {showCalendar && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <iframe
                    src={
                      process.env.REACT_APP_GOOGLE_CALENDAR_EMBED ||
                      "https://calendar.google.com/calendar/embed?src=2301101641%40student.buksu.edu.ph&ctz=UTC"
                    }
                    title="Google Calendar"
                    style={{ border: 0 }}
                    width="100%"
                    height="500"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default CalendarAlerts;
