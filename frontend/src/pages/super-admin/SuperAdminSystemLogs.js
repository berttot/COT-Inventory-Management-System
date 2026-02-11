// src/pages/super-admin/SuperAdminSystemLogs.js
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Package,
  Calendar,
  Archive,
  UserCog,
  LogOut,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Download,
  CalendarDays,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";

import { API_URL } from "../../config/api";

const LOGS_API = `${API_URL}/logs`;
const AUDIT_ACTIONS = [
  { value: "", label: "All actions" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "CREATE_ACCOUNT", label: "Create account" },
  { value: "INVITE_USER", label: "Invite user" },
  { value: "PASSWORD_CHANGED", label: "Password changed" },
  { value: "PASSWORD_RESET", label: "Password reset" },
  { value: "PROFILE_UPDATED", label: "Profile updated" },
  { value: "ARCHIVE_USER", label: "Archive user" },
  { value: "UNARCHIVE_USER", label: "Unarchive user" },
];

export default function SuperAdminSystemLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [filter, setFilter] = useState({
    role: "",
    action: "",
    from: "",
    to: "",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await fetch(`${API_URL}/logs/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
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

  const fetchLogs = useCallback(
    async (p = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: p, limit });
        if (filter.role) params.set("role", filter.role);
        if (filter.action) params.set("action", filter.action);
        if (filter.from) params.set("from", filter.from);
        if (filter.to) params.set("to", filter.to);

        const res = await fetch(`${LOGS_API}?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load logs");
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total ?? 0);
        setPage(data.page || p);
      } catch (err) {
        console.error("Fetch logs error:", err);
        toast.error("Unable to load activity log");
      } finally {
        setLoading(false);
      }
    },
    [filter.role, filter.action, filter.from, filter.to, limit]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
  }, []);

  const handleApplyFilters = () => fetchLogs(1);

  const handleClearFilters = () => {
    setFilter({ role: "", action: "", from: "", to: "" });
  };

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);
      const params = new URLSearchParams({ limit: 1000 });
      if (filter.role) params.set("role", filter.role);
      if (filter.action) params.set("action", filter.action);
      if (filter.from) params.set("from", filter.from);
      if (filter.to) params.set("to", filter.to);

      const res = await fetch(`${LOGS_API}/export/pdf?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `COT_Activity_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Report downloaded");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to download report");
    } finally {
      setPdfLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-xl">
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
                <p className="text-sm font-medium text-white mb-1">{userName || "Super Admin"}</p>
                <p className="text-xs opacity-70 text-white mb-3">College of Technology</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="p-1 rounded hover:bg-white/10 transition"
            >
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">
              Activity Report
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
              System-wide activity log: logins, logouts, account creation, password changes, profile updates, and user archive/restore.
            </p>
          </div>

          {/* Filters — horizontal bar, same style as Request Log */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <select
              value={filter.role}
              onChange={(e) => setFilter({ ...filter, role: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20 min-w-[10rem]"
            >
              <option value="">All roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="departmentadmin">Department Admin</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20 min-w-[10rem]"
            >
              {AUDIT_ACTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-500" />
              <input
                type="date"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-lg bg-[#002B7F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#001d57]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            >
              Clear
            </button>
            <div className="flex items-center border-l border-slate-200 pl-4">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {pdfLoading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading activity log…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="py-3 px-4 text-left font-semibold">Time</th>
                      <th className="py-3 px-4 text-left font-semibold">User</th>
                      <th className="py-3 px-4 text-left font-semibold">Role</th>
                      <th className="py-3 px-4 text-left font-semibold">Action</th>
                      <th className="py-3 px-4 text-left font-semibold">Details</th>
                      <th className="py-3 px-4 text-left font-semibold">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                          No activity found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr
                          key={log._id}
                          className={`border-b border-slate-100 transition ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          } hover:bg-slate-100/80`}
                        >
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {log.name || log.userId || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 capitalize">
                            {log.role || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#0a2a66]/10 text-[#0a2a66]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                            {log.details || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                            {log.ipAddress || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages || 1} · {total} total entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
