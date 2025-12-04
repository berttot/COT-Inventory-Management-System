import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  LogOut,
  UserCog,
  Clock,
  Package,
  Calendar,
  Archive,
  FileText,
} from "lucide-react";

const SuperAdminRequests = () => {
  const [requestsByDept, setRequestsByDept] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");       // ✅ NEW DAY FILTER
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [loading, setLoading] = useState(false);            // ✅ LOADING STATE
  const navigate = useNavigate();
  const location = useLocation();

  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUserName(storedUser.name || "Super Admin");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        let url = "http://localhost:5000/api/requests/all";

        const params = [];

        if (selectedMonth) params.push(`month=${selectedMonth}`);
        if (selectedYear) params.push(`year=${selectedYear}`);
        if (selectedDay) params.push(`day=${selectedDay}`);

        if (params.length > 0) {
          url += "?" + params.join("&");
        }

        const res = await fetch(url);
        const data = await res.json();
        setRequestsByDept(data);
      } catch (err) {
        console.error("Error fetching all requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, selectedDay]);

  const handleLogout = async () => {
    if (logoutLoading) return;
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
      setTimeout(() => {
        setLogoutLoading(false);
        navigate("/");
      }, 300);
    }
  };

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-semibold"
        : "text-white hover:bg-white/10"
    }`;

  const getStatusStyle = (status) => {
    if (status === "Successful")
      return "bg-green-100 text-green-600 border border-green-300";
    if (status === "Unsuccessful")
      return "bg-red-100 text-red-600 border border-red-300";
    return "bg-gray-100 text-gray-600 border border-gray-300";
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Super Admin Portal
          </p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} />
              Dashboard
            </Link>

            <Link
              to="/super-admin/requests"
              className={getLinkClass("/super-admin/requests")}
            >
              <ClipboardList size={18} />
              Request Log
            </Link>

            <Link
              to="/super-admin/manage-inventory"
              className={getLinkClass("/super-admin/manage-inventory")}
            >
              <Package size={18} />
              Manage Inventory
            </Link>

            <Link
              to="/super-admin/calendar-alerts"
              className={getLinkClass("/super-admin/calendar-alerts")}
            >
              <Calendar size={18} />
              Calendar Alerts
            </Link>

            <Link
              to="/super-admin/archived-records"
              className={getLinkClass("/super-admin/archived-records")}
            >
              <Archive size={18} />
              Archived Records
            </Link>

            <Link
              to="/super-admin/system-logs"
              className={getLinkClass("/super-admin/system-logs")}
            >
              <FileText size={18} /> System Logs
            </Link>
          </nav>
        </div>

        {/* User + Logout */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">
                  {userName}
                </p>
                <p className="text-xs opacity-70 text-white mb-3">
                  College of Technology
                </p>
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
                ${
                  logoutLoading
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
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#002B7F]">
              All Department Request Logs
            </h1>
            <p className="text-gray-600">
              View and manage all request logs from various departments.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>

            {/* Day Dropdown */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Days</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>

            {/* Clear Filter */}
            <button
              onClick={() => {
                setSelectedMonth("");
                setSelectedDay("");
                setSelectedYear(new Date().getFullYear());
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition"
            >
              Clear Filter
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <p className="text-gray-500">Loading requests...</p>
        ) : Object.keys(requestsByDept).length === 0 ? (
          <p className="text-gray-500 italic">No requests found.</p>
        ) : (
          Object.entries(requestsByDept).map(([dept, reqs]) => (
            <div key={dept} className="mb-10">
              <h2 className="text-xl font-semibold text-[#002B7F] mb-3">
                {dept}
              </h2>

              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                {reqs.length === 0 ? (
                  <p className="text-gray-500 italic">
                    No requests found for this date.
                  </p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="border-b text-gray-700 bg-gray-50">
                      <tr>
                        <th className="py-3">Staff Name</th>
                        <th className="py-3">Item Name</th>
                        <th className="py-3">Quantity</th>
                        <th className="py-3">Status</th>
                        <th className="py-3">Requested Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reqs.map((req, index) => (
                        <tr
                          key={req._id}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } border-b`}
                        >
                          <td className="py-3 font-medium">
                            {req.requestedBy}
                          </td>
                          <td>{req.itemName}</td>
                          <td>{req.quantity}</td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyle(
                                req.status
                              )}`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="flex items-center gap-1 text-gray-600">
                            <Clock size={14} />
                            {new Date(req.requestedAt).toLocaleString(
                              "en-PH",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default SuperAdminRequests;
