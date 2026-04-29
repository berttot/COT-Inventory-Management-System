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
import { logout } from "../../utils/auth";

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

    await logout({
      recordLogout: true,
      details: "User signed out via UI",
      onComplete: () => {
        setTimeout(() => {
          setLogoutLoading(false);
          navigate("/");
        }, 300);
      },
    });
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
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Super Admin Portal</p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link to="/super-admin/manage-users" className={getLinkClass("/super-admin/manage-users")}>
              <UserCog size={18} /> Manage Users
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
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Calendar Alerts</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Monitor stock-critical items and review recent inventory events synced from Google Calendar.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Out of stock: {outOfStock.length}</span>
                  <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Low stock: {lowStock.length}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={includeArchived}
                      onChange={(e) => setIncludeArchived(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Include archived items
                  </label>
                  <button
                    onClick={fetchAlertSummary}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0a2a66] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#082554] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Use refresh to pull latest alerts and events on demand.</p>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              <p className="font-semibold">Failed to load alerts</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[#0a2a66]">Active Stock Alerts</h2>
                {activeAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                    <div className="mb-4 rounded-full bg-emerald-50 p-4">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">All items are in good stock</h3>
                    <p className="mt-1 text-sm text-slate-500">No items are currently low or out of stock.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAlerts.map((item) => (
                      <div
                        key={item._id}
                        className={`flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm ${
                          item.status === "Out of Stock" ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-4">
                          {item.status === "Out of Stock" ? (
                            <AlertCircle className="h-8 w-8 shrink-0 text-red-500" />
                          ) : (
                            <AlertTriangle className="h-8 w-8 shrink-0 text-amber-500" />
                          )}
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate font-semibold text-slate-900">
                              {item.name}
                              {item.isArchived && (
                                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Archived</span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600">
                              {item.category} - {item.quantity} {item.unit}
                            </p>
                          </div>
                        </div>
                        <Link
                          to="/super-admin/manage-inventory"
                          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0a2a66] px-4 py-2 text-white transition hover:bg-[#082554]"
                        >
                          <ExternalLink size={16} />
                          Manage
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-[#0a2a66]">Recent Activity (Last 30 Days)</h2>
                {recentEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                    <div className="mb-4 rounded-full bg-slate-100 p-4">
                      <Calendar className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">No recent events</h3>
                    <p className="mt-1 text-sm text-slate-500">Stock change events will appear here once Google Calendar is connected.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <ul className="divide-y divide-slate-100">
                      {recentEvents.slice(0, 20).map((event, i) => (
                        <li key={event.id || i} className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-50/60">
                          {getEventIcon(event.summary)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900">{event.summary}</p>
                            {event.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{event.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm text-slate-500">{formatEventDate(event)}</span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getEventBadgeClass(event.summary)}`}>
                            {event.summary?.split(":")[0] || "Event"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="mb-2 inline-flex items-center gap-2 font-semibold text-[#0a2a66] hover:underline"
                >
                  {showCalendar ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  Google Calendar Embed
                </button>
                {showCalendar && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
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
        </div>
      </main>
    </div>
  );
};

export default CalendarAlerts;
