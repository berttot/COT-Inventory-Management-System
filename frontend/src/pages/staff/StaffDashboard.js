import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";
import {
  Home,
  ClipboardList,
  History,
  LogOut,
  ChevronUp,
  ChevronDown,
  User,
  Settings,
  PlusCircle,
  Package,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("Information Technology");
  const [showLogout, setShowLogout] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const [recentRequests, setRecentRequests] = useState([]);
  const [userId, setUserId] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Logout Handler
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

  // Load user info
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUserName(storedUser.name);
      setDepartment(storedUser.department);
      setUserId(storedUser._id);
    }
  }, []);

  const [chartData, setChartData] = useState([]);

  // Fetch total items and staff requests (recent list, chart data, and this year's count)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, staffReqsRes] = await Promise.all([
          fetch(`${API_URL}/requests/summary`),
          userId ? fetch(`${API_URL}/requests/staff/${userId}`) : Promise.resolve(null),
        ]);

        const summaryData = await summaryRes.json();
        setTotalItems(summaryData.totalItems || 0);

        if (staffReqsRes && staffReqsRes.ok) {
          const staffReqs = await staffReqsRes.json();
          const list = Array.isArray(staffReqs) ? staffReqs : [];
          setRecentRequests(list.slice(0, 5));

          const year = new Date().getFullYear();
          const thisYearCount = list.filter((r) => {
            const d = r.requestedAt ? new Date(r.requestedAt) : r.createdAt ? new Date(r.createdAt) : null;
            return d && d.getFullYear() === year;
          }).length;
          setTotalRequests(thisYearCount);

          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const byMonth = months.map((label) => ({ month: label, requests: 0 }));
          list.forEach((r) => {
            const d = r.requestedAt ? new Date(r.requestedAt) : r.createdAt ? new Date(r.createdAt) : null;
            if (d && d.getFullYear() === year) {
              const idx = d.getMonth();
              if (byMonth[idx]) byMonth[idx].requests += 1;
            }
          });
          setChartData(byMonth);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    } else {
      fetch(`${API_URL}/requests/summary`)
        .then((r) => r.json())
        .then((d) => setTotalItems(d.totalItems || 0))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [userId]);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Staff Portal</p>

          <nav className="space-y-2">
            <Link to="/staff" className={getLinkClass("/staff")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link to="/staff/requests" className={getLinkClass("/staff/requests")}>
              <ClipboardList size={18} /> Request Items
            </Link>
            <Link to="/staff/history" className={getLinkClass("/staff/history")}>
              <History size={18} /> History
            </Link>
          </nav>
        </div>

        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <User size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department}</p>
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
                onClick={() => navigate("/staff/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2 mb-1"
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={` w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                  ${
                    logoutLoading
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
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Welcome header with gradient accent */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm font-medium text-[#0a2a66]/80 uppercase tracking-wide mb-1">
              {getGreeting()}
            </p>
            <h1 className="text-3xl font-bold text-[#0a2a66]">
              Welcome back, {userName || "User"}!
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your requests and track their progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/staff/requests")}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2.5 rounded-xl hover:bg-[#0b347a] transition shadow-md hover:shadow-lg"
            >
              <PlusCircle size={18} /> Make Request
            </button>
            <button
              onClick={() => navigate("/staff/history")}
              className="flex items-center gap-2 bg-[#f97316] text-white px-4 py-2.5 rounded-xl hover:bg-orange-600 transition shadow-md hover:shadow-lg"
            >
              <History size={18} /> View History
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#0a2a66] hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-500 text-sm font-medium">Total Items</h2>
                <p className="text-3xl font-bold mt-2 text-[#0a2a66]">{totalItems}</p>
                <p className="text-sm text-gray-400 mt-1">Available in inventory</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0a2a66]/10">
                <Package className="text-[#0a2a66]" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#f97316] hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-500 text-sm font-medium">Total Requests</h2>
                <p className="text-3xl font-bold mt-2 text-[#f97316]">{totalRequests}</p>
                <p className="text-sm text-gray-400 mt-1">This year</p>
              </div>
              <div className="p-3 rounded-xl bg-[#f97316]/10">
                <ClipboardList className="text-[#f97316]" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart + Quick actions row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* My requests this year - chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="text-[#0a2a66]" size={18} />
              My Requests This Year
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} requests`, "Requests"]}
                  contentStyle={{ borderRadius: "8px" }}
                />
                <Bar dataKey="requests" fill="#0a2a66" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="text-[#0a2a66]" size={18} />
              Quick Actions
            </h2>
            <Link
              to="/staff/requests"
              className="block bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#0a2a66] hover:shadow-lg transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0a2a66]/10 group-hover:bg-[#0a2a66]/20 transition">
                    <PlusCircle className="text-[#0a2a66]" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Make a Request</h3>
                    <p className="text-sm text-gray-500">Request items from inventory</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-[#0a2a66] transition" size={20} />
              </div>
            </Link>
            <Link
              to="/staff/history"
              className="block bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#f97316] hover:shadow-lg transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#f97316]/10 group-hover:bg-[#f97316]/20 transition">
                    <History className="text-[#f97316]" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">View History</h3>
                    <p className="text-sm text-gray-500">See all your past requests</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-[#f97316] transition" size={20} />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent requests */}
        <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <History className="text-[#0a2a66]" size={18} />
              Recent Requests
            </h2>
            <Link
              to="/staff/history"
              className="text-sm font-medium text-[#0a2a66] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm py-4">Loading...</p>
          ) : recentRequests.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No requests yet. Make your first request from Request Items.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium">Quantity</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req) => (
                    <tr key={req._id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 font-medium text-gray-800">{req.itemName || "—"}</td>
                      <td className="py-3 text-gray-600">{req.quantity ?? "—"}</td>
                      <td className="py-3 text-gray-600">{formatDate(req.requestedAt || req.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;
