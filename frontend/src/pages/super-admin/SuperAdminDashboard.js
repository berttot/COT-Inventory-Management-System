import React, { useEffect, useState } from "react";
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
  Package,
  Calendar,
  Archive,
  FileText,
} from "lucide-react";


const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [totalUsers, setTotalUsers] = useState(0); 
  const [showLogout, setShowLogout] = useState(false);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [outOfStock, setOutOfStock] = useState(0);
  const [requestData, setRequestData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState("");

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

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


  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total users
        const userRes = await fetch("http://localhost:5000/api/users/count");
        const userData = await userRes.json();
        setTotalUsers(userData.total);

        // Fetch summary stats
        const summaryRes = await fetch("http://localhost:5000/api/requests/summary");
        const summaryData = await summaryRes.json();

        setTotalRequests(summaryData.totalRequests);
        setTotalItems(summaryData.totalItems);
        setOutOfStock(summaryData.outOfStock);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const monthParam = chartMonth ? `&month=${chartMonth}` : "";
        const [trendsRes, deptRes] = await Promise.all([
          fetch(`http://localhost:5000/api/requests/trends?year=${chartYear}${monthParam}`),
          fetch(`http://localhost:5000/api/requests/department-activity?year=${chartYear}${monthParam}`),
        ]);

        const [trendsData, deptData] = await Promise.all([
          trendsRes.json(),
          deptRes.json(),
        ]);

        setRequestData(trendsData);
        setDepartmentData(deptData);
      } catch (error) {
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
    <div className="flex h-screen bg-gray-100 text-gray-900">
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

          {/* Slide-down logout */}
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
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66]">
              Welcome back, {userName || "User"}!
            </h1>
            <p className="text-gray-600">
              Manage your inventory requests and track their performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/super-admin/manage-users")}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-[#0b347a] transition shadow-md"
            >
              <Users size={18} />
              Manage Users
            </button>
            <button 
            onClick={() => navigate("/super-admin/reports")}
            className="flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-md">
              <BarChart3 size={18} />
              View Reports
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#0a2a66] hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Users</h2>
            <p className="text-3xl font-bold mt-2 text-[#0a2a66]">{totalUsers}</p>
            <p className="text-sm text-gray-400">Across all departments</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#f97316] hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Requests</h2>
            <p className="text-3xl font-bold mt-2 text-[#f97316]">{totalRequests}</p>
            <p className="text-sm text-gray-400">Overall Requests by Departments</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-green-500 hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Items</h2>
            <p className="text-3xl font-bold mt-2 text-green-600">{totalItems}</p>
            <p className="text-sm text-gray-400">Total Overall Items</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-red-500 hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Alerts</h2>
            <p className="text-3xl font-bold mt-2 text-red-500">{outOfStock}</p>
            <p className="text-sm text-gray-400">Low stock items</p>
          </div>
        </div>

        {/* Charts */}
        <div className="flex justify-end items-center mb-4 gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Year:</label>
            <select
              value={chartYear}
              onChange={(e) => setChartYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Month:</label>
            <select
              value={chartMonth}
              onChange={(e) => setChartMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ClipboardList className="text-[#0a2a66]" size={18} />
              Request Trends
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={requestData}>
                <XAxis
                  dataKey={chartMonth ? "day" : "month"} // 👈 Switch between month/day
                  tickFormatter={(val) => (chartMonth ? `${val}` : val)}
                  label={{
                    value: chartMonth ? "DAY OF MONTH" : "Month",
                    position: "insideBottom",
                    offset: -5,
                    style: { fill: "#787", fontSize: 12 },
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

          <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
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

        {/* Bottom Cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#0a2a66] hover:shadow-lg transition">
            <h3 className="font-semibold text-gray-700">User Management</h3>
            <p className="text-sm text-gray-500 mb-2">
              Manage user accounts, roles, and permissions
            </p>
            <p className="text-2xl font-bold text-[#0a2a66]">{totalUsers}</p>
            <p className="text-sm text-gray-400">Active Users</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#f97316] hover:shadow-lg transition">
            <h3 className="font-semibold text-gray-700">Global Reports</h3>
            <p className="text-sm text-gray-500 mb-2">
              Generate comprehensive system reports
            </p>
            <p className="text-2xl font-bold text-[#f97316]">1</p>
            <p className="text-sm text-gray-400">Available Reports</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-green-500 hover:shadow-lg transition">
            <h3 className="font-semibold text-gray-700">System Logs</h3>
            <p className="text-sm text-gray-500 mb-2">
              Monitor all system activities and changes
            </p>
            <p className="text-2xl font-bold text-green-600">24/7</p>
            <p className="text-sm text-gray-400">Monitoring Activity</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
