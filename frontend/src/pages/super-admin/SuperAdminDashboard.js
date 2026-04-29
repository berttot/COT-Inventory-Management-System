import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Users,
  BarChart3,
  ClipboardList,
  Home,
  ChevronUp,
  ChevronDown,
  LogOut,
  UserCog,
  Settings,
  Package,
  Calendar,
  Archive,
  FileText,
} from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import { cleanupRecaptcha } from "../../utils/cleanupRecaptcha";
import { logout } from "../../utils/auth";


const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [totalUsers, setTotalUsers] = useState(0); 
  const [showLogout, setShowLogout] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [outOfStock, setOutOfStock] = useState(0);
  const [requestData, setRequestData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Total requests in selected period (year or month) — derived from chart data
  const totalRequestsInPeriod = (requestData || []).reduce(
    (sum, d) => sum + (d.requests || 0),
    0
  );
  const totalRequestsLabel = chartMonth
    ? `In ${new Date(0, parseInt(chartMonth, 10) - 1).toLocaleString("en", { month: "long" })} ${chartYear}`
    : `In ${chartYear}`;

  const AVAILABLE_REPORTS_COUNT = 2; // System Logs Report + Department Comparison & Most Requested Items

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
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


  useEffect(() => {
    // Ensure reCAPTCHA cleanup is active on dashboard load
    cleanupRecaptcha();
    
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setDashboardLoading(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const [userRes, summaryRes] = await Promise.all([
          fetch(`${API_URL}/users/count`, { signal: controller.signal }),
          fetch(`${API_URL}/requests/summary`, { signal: controller.signal }),
        ]);

        if (!userRes.ok) throw new Error("Failed to fetch user count");
        const userData = await userRes.json();
        setTotalUsers(userData.total);

        if (!summaryRes.ok) throw new Error("Failed to fetch summary");
        const summaryData = await summaryRes.json();
        setTotalItems(summaryData.totalItems ?? 0);
        setOutOfStock(summaryData.outOfStock ?? 0);

        clearTimeout(timeout);
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          console.warn("Dashboard data fetch timeout - this is normal");
          return;
        }
        console.error("Error fetching dashboard data:", error);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const monthParam = chartMonth ? `&month=${chartMonth}` : "";
        const [trendsRes, deptRes] = await Promise.all([
          fetch(`${API_URL}/requests/trends?year=${chartYear}${monthParam}`, {
            signal: controller.signal,
          }),
          fetch(`${API_URL}/requests/department-activity?year=${chartYear}${monthParam}`, {
            signal: controller.signal,
          }),
        ]);

        if (!trendsRes.ok || !deptRes.ok) {
          throw new Error("Failed to fetch chart data");
        }

        const [trendsData, deptData] = await Promise.all([
          trendsRes.json(),
          deptRes.json(),
        ]);

        setRequestData(trendsData);
        setDepartmentData(deptData);
        
        clearTimeout(timeout);
      } catch (error) {
        clearTimeout(timeout);
        // Silently handle timeout/abort errors - they're expected and handled by cleanupRecaptcha
        if (error.name === "AbortError") {
          console.warn("Chart data fetch timeout - this is normal");
          return;
        }
        console.error("Error fetching chart data:", error);
      }
    };

    fetchChartData();
  }, [chartYear, chartMonth]);


  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;


  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Super Admin Portal</p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} />
              Dashboard
            </Link>
            <Link to="/super-admin/manage-users" className={getLinkClass("/super-admin/manage-users")}>
              <UserCog size={18} />
              Manage Users
            </Link>
            <Link to="/super-admin/requests" className={getLinkClass("/super-admin/requests")}>
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

        {/* Bottom User Section */}
        
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            {/* Left section: icon + text */}
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName || "Super Admin"}</p>
                <p className="text-xs opacity-70 text-white mb-3">College of Technology</p>
              </div>
            </div>

            {/* Right section: toggle arrow */}
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="p-1 rounded hover:bg-white/10 transition"
            >
              {showLogout ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {/* Slide-down logout & settings */}
          {showLogout && (
            <div className="mt-4 w-full max-w-[220px] flex flex-col gap-2">
              <button
                onClick={() => navigate("/super-admin/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={`w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                  ${logoutLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#f97316] hover:bg-orange-600 text-white"
                  }`}
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
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">
                    Welcome back, {userName || "User"}!
                  </h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {chartMonth ? new Date(0, parseInt(chartMonth, 10) - 1).toLocaleString("en", { month: "long" }) : "Year"} {chartYear}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Monitor inventory, request activity, alerts, and report performance from one consolidated dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">Users: {dashboardLoading ? "—" : totalUsers}</span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">Requests: {totalRequestsInPeriod}</span>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Items: {dashboardLoading ? "—" : totalItems}</span>
                  <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Alerts: {dashboardLoading ? "—" : outOfStock}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <BarChart3 className="text-[#002B7F]" size={16} />
                    Dashboard Actions
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {AVAILABLE_REPORTS_COUNT} reports available
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => navigate("/super-admin/manage-users")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a2a66] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0b347a]"
                  >
                    <Users size={18} />
                    Manage Users
                  </button>
                  <button
                    onClick={() => navigate("/super-admin/requests")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600"
                  >
                    <BarChart3 size={18} />
                    View Reports
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Users</h2>
                  <p className="mt-2 text-3xl font-bold text-[#0a2a66]">{dashboardLoading ? "—" : totalUsers}</p>
                  <p className="text-sm text-slate-400">Across all departments</p>
                </div>
                <div className="rounded-full bg-[#eef4ff] p-3 text-[#0a2a66]">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Requests</h2>
                  <p className="mt-2 text-3xl font-bold text-[#f97316]">{totalRequestsInPeriod}</p>
                  <p className="text-sm text-slate-400">{totalRequestsLabel}</p>
                </div>
                <div className="rounded-full bg-[#fff4ec] p-3 text-[#f97316]">
                  <ClipboardList size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Items</h2>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{dashboardLoading ? "—" : totalItems}</p>
                  <p className="text-sm text-slate-400">In inventory</p>
                </div>
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <Package size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Alerts</h2>
                  <p className="mt-2 text-3xl font-bold text-red-600">{dashboardLoading ? "—" : outOfStock}</p>
                  <p className="text-sm text-slate-400">Low stock items</p>
                </div>
                <div className="rounded-full bg-red-50 p-3 text-red-600">
                  <Archive size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Settings size={16} className="text-[#002B7F]" />
                Chart Filters
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Year:
                  <select
                    value={chartYear}
                    onChange={(e) => setChartYear(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Month:
                  <select
                    value={chartMonth}
                    onChange={(e) => setChartMonth(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
                  >
                    <option value="">All</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("en", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-sm transition hover:shadow-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ClipboardList className="text-[#0a2a66]" size={18} />
                Request Trends
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={requestData}>
                  <XAxis
                    dataKey={chartMonth ? "day" : "month"}
                    tickFormatter={(val) => (chartMonth ? `${val}` : val)}
                    label={{
                      value: chartMonth ? "DAY OF MONTH" : "Month",
                      position: "insideBottom",
                      offset: -5,
                      style: { fill: "#64748b", fontSize: 12 },
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value} requests`, "Requests"]}
                    labelFormatter={(label) =>
                      chartMonth ? `Day ${label}` : `Month: ${label}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#0a2a66"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-sm transition hover:shadow-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart3 className="text-[#f97316]" size={18} />
                Department Activity
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentData}>
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h3 className="font-semibold text-slate-700">User Management</h3>
              <p className="mb-2 text-sm text-slate-500">
                Manage user accounts, roles, and permissions
              </p>
              <p className="text-2xl font-bold text-[#0a2a66]">
                {dashboardLoading ? "—" : totalUsers}
              </p>
              <p className="text-sm text-slate-400">Active Users</p>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h3 className="font-semibold text-slate-700">Global Reports</h3>
              <p className="mb-2 text-sm text-slate-500">
                System Logs Report, Department Comparison & Most Requested Items
              </p>
              <p className="text-2xl font-bold text-[#f97316]">{AVAILABLE_REPORTS_COUNT}</p>
              <p className="text-sm text-slate-400">Available Reports</p>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h3 className="font-semibold text-slate-700">System Logs</h3>
              <p className="mb-2 text-sm text-slate-500">
                Monitor all system activities and changes
              </p>
              <p className="text-2xl font-bold text-emerald-600">Active</p>
              <p className="text-sm text-slate-400">Monitoring</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
