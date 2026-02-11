import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";
import {
  ClipboardList,
  Home,
  ChevronUp,
  ChevronDown,
  LogOut,
  User,
  Users,
  BarChart3,
  Settings,
  Archive,
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

const DepartmentAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [department, setDepartment] = useState("");

  const [totalRequests, setTotalRequests] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [recentRequests, setRecentRequests] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Load department and username
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedDept = localStorage.getItem("department");
    if (storedName) setUserName(storedName);
    if (storedDept) setDepartment(storedDept);
  }, []);

  // Fetch summary + department requests (stats, chart, recent in one flow)
  useEffect(() => {
    if (!department) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, deptReqsRes] = await Promise.all([
          fetch(`${API_URL}/requests/summary`),
          fetch(`${API_URL}/requests/department/${encodeURIComponent(department)}`),
        ]);

        const summaryData = await summaryRes.json();
        setTotalItems(summaryData.totalItems || 0);

        if (deptReqsRes.ok) {
          const list = await deptReqsRes.json();
          const requests = Array.isArray(list) ? list : [];

          const year = new Date().getFullYear();
          const thisYearCount = requests.filter((r) => {
            const d = r.requestedAt ? new Date(r.requestedAt) : r.createdAt ? new Date(r.createdAt) : null;
            return d && d.getFullYear() === year;
          }).length;
          setTotalRequests(thisYearCount);

          setRecentRequests(requests.slice(0, 5));

          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const byMonth = months.map((label) => ({ month: label, requests: 0 }));
          requests.forEach((r) => {
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

    fetchData();
  }, [department]);

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
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Dept. Admin Portal
          </p>

          <nav className="space-y-2">
            <Link to="/department-admin" className={getLinkClass("/department-admin")}>
              <Home size={18} />
              Dashboard
            </Link>
            <Link
              to="/department-admin/users"
              className={getLinkClass("/department-admin/users")}
            >
              <Users size={18} />
              Manage Staff
            </Link>
            <Link
              to="/department-admin/requests"
              className={getLinkClass("/department-admin/requests")}
            >
              <ClipboardList size={18} />
              Request Log
            </Link>
            <Link to="/department-admin/archived-users" className={getLinkClass("/department-admin/archived-users")}>
              <Archive size={18} /> Archived Staff
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
                onClick={() => navigate("/department-admin/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2 mb-1"
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
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Welcome header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm font-medium text-[#0a2a66]/80 uppercase tracking-wide mb-1">
              {getGreeting()}
            </p>
            <h1 className="text-3xl font-bold text-[#0a2a66]">
              Welcome back, {userName || "User"}!
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your department&apos;s inventory and requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/department-admin/requests")}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2.5 rounded-xl hover:bg-[#0b347a] transition shadow-md hover:shadow-lg"
            >
              <BarChart3 size={18} />
              View Reports
            </button>
            <button
              onClick={() => navigate("/department-admin/requests")}
              className="flex items-center gap-2 bg-[#f97316] text-white px-4 py-2.5 rounded-xl hover:bg-orange-600 transition shadow-md hover:shadow-lg"
            >
              <ClipboardList size={18} />
              View Requests
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
                <p className="text-sm text-gray-400 mt-1">This year ({department})</p>
              </div>
              <div className="p-3 rounded-xl bg-[#f97316]/10">
                <ClipboardList className="text-[#f97316]" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="text-[#0a2a66]" size={18} />
              Department Requests This Year
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

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="text-[#0a2a66]" size={18} />
              Quick Actions
            </h2>
            <Link
              to="/department-admin/requests"
              className="block bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#0a2a66] hover:shadow-lg transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0a2a66]/10 group-hover:bg-[#0a2a66]/20 transition">
                    <ClipboardList className="text-[#0a2a66]" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Request Log</h3>
                    <p className="text-sm text-gray-500">View all department requests</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-[#0a2a66] transition" size={20} />
              </div>
            </Link>
            <Link
              to="/department-admin/users"
              className="block bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#f97316] hover:shadow-lg transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#f97316]/10 group-hover:bg-[#f97316]/20 transition">
                    <Users className="text-[#f97316]" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Manage Staff</h3>
                    <p className="text-sm text-gray-500">Manage department staff</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-[#f97316] transition" size={20} />
              </div>
            </Link>
            <Link
              to="/department-admin/requests"
              className="block bg-white rounded-2xl shadow-md p-5 border-t-4 border-emerald-500 hover:shadow-lg transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition">
                    <BarChart3 className="text-emerald-600" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Reports</h3>
                    <p className="text-sm text-gray-500">View department reports</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-emerald-600 transition" size={20} />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent requests */}
        <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="text-[#0a2a66]" size={18} />
              Recent Department Requests
            </h2>
            <Link
              to="/department-admin/requests"
              className="text-sm font-medium text-[#0a2a66] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm py-4">Loading...</p>
          ) : recentRequests.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No requests in your department yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium">Quantity</th>
                    <th className="pb-3 font-medium">Requested by</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req) => (
                    <tr key={req._id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 font-medium text-gray-800">{req.itemName || "—"}</td>
                      <td className="py-3 text-gray-600">{req.quantity ?? "—"}</td>
                      <td className="py-3 text-gray-600">{req.requestedBy || "—"}</td>
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

export default DepartmentAdminDashboard;
