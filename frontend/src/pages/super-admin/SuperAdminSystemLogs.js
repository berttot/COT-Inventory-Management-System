// src/pages/SuperAdminSystemLogs.jsx
import React, { useEffect, useState, useCallback  } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Home, ClipboardList, Package, Calendar, Archive, UserCog, LogOut, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { toast } from "react-toastify";

const API = "http://localhost:5000/api/logs";

export default function SuperAdminSystemLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ role: "", action: "", from: "", to: "" });

  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
    setLogoutLoading(true);

    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/logs/logout", {
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

      // Small delay for better UX
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

        const res = await fetch(`${API}?${params.toString()}`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error("Failed to load logs");

        const data = await res.json();
        setLogs(data.logs || []);
        setPage(data.page || p);
      } catch (err) {
        console.error("Fetch logs error:", err);
        toast.error("Unable to load logs");
      } finally {
        setLoading(false);
      }
    },
    [filter, limit]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // const handleFilterApply = () => fetchLogs(1);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
  }, []);
  

  return (
    <div className="flex h-screen bg-gray-100">
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

        {/* Bottom User Section */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
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
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className={`mt-4 w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                ${logoutLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#f97316] hover:bg-orange-600 text-white"
                }`}
            >
              <LogOut size={16} />
              {logoutLoading ? "Logging out..." : "Log Out"}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-3xl font-bold text-[#0a2a66] mb-6">System Logs</h1>

        {/* Filters */}
        <div className="bg-white p-3 rounded-lg border mb-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2 text-gray-700">Filters</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            
            {/* Role */}
            <div>
              <label className="text-xs font-medium text-gray-600">Role</label>
              <select
                value={filter.role}
                onChange={(e) => setFilter({ ...filter, role: e.target.value })}
                className="w-full border rounded-md p-1.5 text-xs mt-1"
              >
                <option value="">All</option>
                <option value="superadmin">superadmin</option>
                <option value="departmentadmin">departmentadmin</option>
                <option value="staff">staff</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="text-xs font-medium text-gray-600">Action</label>
              <input
                value={filter.action}
                onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                placeholder="LOGIN / ARCHIVE_USER..."
                className="w-full border rounded-md p-1.5 text-xs mt-1"
              />
            </div>

            {/* From */}
            <div>
              <label className="text-xs font-medium text-gray-600">From</label>
              <input
                type="date"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="w-full border rounded-md p-1.5 text-xs mt-1"
              />
            </div>

            {/* To */}
            <div>
              <label className="text-xs font-medium text-gray-600">To</label>
              <input
                type="date"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="w-full border rounded-md p-1.5 text-xs mt-1"
              />
            </div>
          </div>

          {/* <button
            onClick={handleFilterApply}
            className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition"
          >
            Apply
          </button> */}
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-gray-600 text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 text-[10px] uppercase tracking-wide border-b">
                    <th className="py-2 px-3 text-left font-semibold">Time</th>
                    <th className="py-2 px-3 text-left font-semibold">User</th>
                    <th className="py-2 px-3 text-left font-semibold">Role</th>
                    <th className="py-2 px-3 text-left font-semibold">Action</th>
                    <th className="py-2 px-3 text-left font-semibold">Details</th>
                    <th className="py-2 px-3 text-left font-semibold">IP</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td className="p-3 italic text-gray-500 text-center" colSpan={6}>
                        No logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b hover:bg-gray-50 transition text-gray-700"
                      >
                        <td className="py-1.5 px-3">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>

                        <td className="py-1.5 px-3">{log.name || log.userId || "—"}</td>

                        <td className="py-1.5 px-3">{log.role}</td>

                        <td className="py-1.5 px-3 font-semibold text-blue-600">
                          {log.action}
                        </td>

                        <td className="py-1.5 px-3 whitespace-pre-wrap">
                          {log.details}
                        </td>

                        <td className="py-1.5 px-3">{log.ipAddress || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => fetchLogs(Math.max(1, page - 1))}
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-100"
          >
            Prev
          </button>
          <button
            onClick={() => fetchLogs(page + 1)}
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
