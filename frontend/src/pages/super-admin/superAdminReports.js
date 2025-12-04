import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  ClipboardList,
  Home,
  ChevronUp,
  ChevronDown,
  LogOut,
  BarChart3,
  FileText,
  UserCog,
  Package,
  Calendar,
  Archive,
} from "lucide-react";
import { toast } from "react-toastify";


const SuperAdminReports = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  const [loadingReport, setLoadingReport] = useState(false);


  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUserName(storedUser.name || storedUser.username || "Super Admin");
    }
  }, []);

  // 🧾 Generate COMBINED REPORT
  const handleGenerateReport = async () => {
    if (!month || !year) {
      toast.warning("Please select both month and year.");
      return;
    }

    setLoadingReport(true);

    try {
      // Since there is only ONE report type now
      const endpoint = "combined";

      const url = `http://localhost:5000/api/reports/superadmin/${endpoint}?month=${month}&year=${year}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate report");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      toast.success("Report generated successfully!");
    } catch (err) {
      console.error("Error generating report:", err);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  };


  // Logout
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

  // Sidebar link style
  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

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

        {/* Bottom User Section */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
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
                ${logoutLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#f97316] hover:bg-orange-600 text-white"}`}
            >
              <LogOut size={16} />
              {logoutLoading ? "Logging out..." : "Log Out"}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66] flex items-center gap-2">
              <BarChart3 size={26} />
              Generate Report
            </h1>
            <p className="text-gray-600">
              Generates both Department Comparison and Most Requested Items in one PDF.
            </p>
          </div>
        </div>

        {/* Report Form */}
        <div className="bg-white w-full max-w-3xl rounded-2xl shadow-md p-8 border border-gray-200 mx-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">

            {/* Month */}
            <div>
              <label className="block text-gray-600 text-sm mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              >
                <option value="">Select Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-gray-600 text-sm mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                placeholder="e.g. 2025"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerateReport}
              disabled={loadingReport}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition shadow-md text-white
                ${loadingReport ? "bg-gray-400 cursor-not-allowed" : "bg-[#0b347a] hover:bg-[#0a2a66]"}
              `}
            >
              {loadingReport ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Generate Report (PDF)
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-gray-400 text-sm mt-8 text-center">
          This report includes department comparison and item demand analytics for the selected month.
        </p>
      </main>
    </div>
  );
};

export default SuperAdminReports;
