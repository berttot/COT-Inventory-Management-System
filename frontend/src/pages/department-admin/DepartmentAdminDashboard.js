import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";
import { logout } from "../../utils/auth";
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
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Dept. Admin Portal</p>

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
            <Link
              to="/department-admin/archived-users"
              className={getLinkClass("/department-admin/archived-users")}
            >
              <Archive size={18} /> Archived Staff
            </Link>
          </nav>
        </div>

        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <User size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName || "Department Admin"}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department || "Department"}</p>
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
                    {department || "Department"}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Manage department inventory, request activity, and team workflows from one consolidated dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Items: {loading ? "—" : totalItems}
                  </span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                    Requests: {loading ? "—" : totalRequests}
                  </span>
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
                    Recent: {loading ? "—" : recentRequests.length}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <BarChart3 className="text-[#002B7F]" size={16} />
                    Dashboard Actions
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    Department tools
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => navigate("/department-admin/requests")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a2a66] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0b347a]"
                  >
                    <BarChart3 size={18} />
                    View Reports
                  </button>
                  <button
                    onClick={() => navigate("/department-admin/requests")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600"
                  >
                    <ClipboardList size={18} />
                    View Requests
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Items</h2>
                  <p className="mt-2 text-3xl font-bold text-[#0a2a66]">{loading ? "—" : totalItems}</p>
                  <p className="text-sm text-slate-400">Available in inventory</p>
                </div>
                <div className="rounded-full bg-[#eef4ff] p-3 text-[#0a2a66]">
                  <Package size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Requests</h2>
                  <p className="mt-2 text-3xl font-bold text-[#f97316]">{loading ? "—" : totalRequests}</p>
                  <p className="text-sm text-slate-400">This year ({department || "Department"})</p>
                </div>
                <div className="rounded-full bg-[#fff4ec] p-3 text-[#f97316]">
                  <ClipboardList size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-sm transition hover:shadow-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <TrendingUp className="text-[#0a2a66]" size={18} />
                Department Requests This Year
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} requests`, "Requests"]} />
                  <Bar dataKey="requests" fill="#0a2a66" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ClipboardList className="text-[#0a2a66]" size={18} />
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  to="/department-admin/requests"
                  className="group flex items-center justify-between rounded-2xl border border-[#dbe7ff] bg-white p-4 transition hover:border-[#c2d7ff] hover:bg-[#f8fbff]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#eef4ff] p-2.5 text-[#0a2a66]">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Request Log</h3>
                      <p className="text-xs text-slate-500">View all department requests</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-400 transition group-hover:text-[#0a2a66]" size={18} />
                </Link>

                <Link
                  to="/department-admin/users"
                  className="group flex items-center justify-between rounded-2xl border border-[#dbe7ff] bg-white p-4 transition hover:border-[#ffd8bd] hover:bg-[#fff8f2]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#fff4ec] p-2.5 text-[#f97316]">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Manage Staff</h3>
                      <p className="text-xs text-slate-500">Manage department staff accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-400 transition group-hover:text-[#f97316]" size={18} />
                </Link>

                <Link
                  to="/department-admin/requests"
                  className="group flex items-center justify-between rounded-2xl border border-[#dbe7ff] bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Reports</h3>
                      <p className="text-xs text-slate-500">Review department performance</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-400 transition group-hover:text-emerald-600" size={18} />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ClipboardList className="text-[#0a2a66]" size={18} />
                Recent Department Requests
              </h2>
              <Link
                to="/department-admin/requests"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#0a2a66] hover:underline"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <p className="py-4 text-sm text-slate-500">Loading...</p>
            ) : recentRequests.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No requests in your department yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Requested by</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((req) => (
                      <tr key={req._id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-800">{req.itemName || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{req.quantity ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{req.requestedBy || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(req.requestedAt || req.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DepartmentAdminDashboard;
