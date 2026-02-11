import React, { useEffect, useState, useMemo } from "react";
import { API_URL } from "../../config/api";
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
  Settings,
  Search,
  LayoutList,
  Layers,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowDownToLine,
  CalendarDays,
  FileDown,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";

// Flatten grouped requests into one array with department on each item
const flattenRequests = (requestsByDept) => {
  return Object.entries(requestsByDept).flatMap(([department, reqs]) =>
    (reqs || []).map((r) => ({ ...r, department }))
  );
};

// Short transaction ID for display
const shortId = (id) => (id ? String(id).slice(-8).toUpperCase() : "—");

const SuperAdminRequests = () => {
  const [requestsByDept, setRequestsByDept] = useState({});
  const [periodPreset, setPeriodPreset] = useState("all"); // "all" | "thisMonth" | "thisYear" | "custom"
  const [customMonth, setCustomMonth] = useState("");
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("all"); // "all" | "byDept"
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUserName(storedUser.name || "Super Admin");
  }, []);

  // Derive API date params from period preset
  const dateParams = useMemo(() => {
    const now = new Date();
    if (periodPreset === "thisMonth") {
      return { month: now.getMonth() + 1, year: now.getFullYear(), day: "" };
    }
    if (periodPreset === "thisYear") {
      return { month: "", year: now.getFullYear(), day: "" };
    }
    if (periodPreset === "custom") {
      return { month: customMonth, year: customYear, day: "" };
    }
    return { month: "", year: "", day: "" };
  }, [periodPreset, customMonth, customYear]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = `${API_URL}/requests/all`;
        const params = [];
        if (dateParams.month) params.push(`month=${dateParams.month}`);
        if (dateParams.year) params.push(`year=${dateParams.year}`);
        if (dateParams.day) params.push(`day=${dateParams.day}`);
        if (params.length > 0) url += "?" + params.join("&");

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
  }, [dateParams.month, dateParams.year, dateParams.day]);

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
        ? "bg-white text-[#0a2a66] font-semibold"
        : "text-white hover:bg-white/10"
    }`;

  const handleGenerateReport = async () => {
    if (!reportMonth || !reportYear) {
      toast.warning("Please select both month and year for the report.");
      return;
    }
    setLoadingReport(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/reports/superadmin/combined?month=${reportMonth}&year=${reportYear}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const allRequests = useMemo(
    () => flattenRequests(requestsByDept),
    [requestsByDept]
  );

  const departments = useMemo(
    () => [...new Set(allRequests.map((r) => r.department))].sort(),
    [allRequests]
  );

  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (departmentFilter && req.department !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (req.requestedBy || "").toLowerCase().includes(q);
        const matchItem = (req.itemName || "").toLowerCase().includes(q);
        const matchDept = (req.department || "").toLowerCase().includes(q);
        if (!matchName && !matchItem && !matchDept) return false;
      }
      return true;
    });
  }, [allRequests, departmentFilter, searchQuery]);

  // Reset pagination when filters / view change
  useEffect(() => {
    setPage(1);
  }, [
    periodPreset,
    customMonth,
    customYear,
    departmentFilter,
    searchQuery,
    viewMode,
  ]);

  // Pagination (All view)
  const total = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRequests = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, safePage, PAGE_SIZE]);

  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const successful = filteredRequests.filter(
      (r) => r.status === "Successful"
    ).length;
    const unsuccessful = total - successful;
    return { total, successful, unsuccessful };
  }, [filteredRequests]);

  const groupedByDept = useMemo(() => {
    const map = {};
    filteredRequests.forEach((req) => {
      const d = req.department || "Other";
      if (!map[d]) map[d] = [];
      map[d].push(req);
    });
    return map;
  }, [filteredRequests]);

  const getStatusStyle = (status) => {
    if (status === "Successful")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Unsuccessful")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const TransactionTable = ({ requests, showDepartment = false }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-4 py-3.5">Transaction ID</th>
            <th className="px-4 py-3.5">Date & time</th>
            <th className="px-4 py-3.5">Type</th>
            {showDepartment && <th className="px-4 py-3.5">Department</th>}
            <th className="px-4 py-3.5">Requested by</th>
            <th className="px-4 py-3.5">Item</th>
            <th className="px-4 py-3.5 text-right">Qty</th>
            <th className="px-4 py-3.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((req, index) => (
            <tr
              key={req._id}
              className="transition-colors hover:bg-slate-50/50"
            >
              <td className="px-4 py-3 font-mono text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Hash size={12} />
                  {shortId(req._id)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {new Date(req.requestedAt).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  <ArrowDownToLine size={12} />
                  Item request
                </span>
              </td>
              {showDepartment && (
                <td className="px-4 py-3 font-medium text-slate-700">
                  {req.department}
                </td>
              )}
              <td className="px-4 py-3 font-medium text-slate-800">
                {req.requestedBy}
              </td>
              <td className="px-4 py-3 text-slate-700">{req.itemName}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800">
                {req.quantity}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                    req.status
                  )}`}
                >
                  {req.status === "Successful" ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {req.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-slate-100"
        />
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-4">
        <ClipboardList size={40} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">
        No transactions found
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {searchQuery || departmentFilter || periodPreset !== "all"
          ? "Try adjusting your filters or period."
          : "Requests from staff will appear here as transaction history."}
      </p>
    </div>
  );

  const PaginationBar = ({ totalCount, pageNumber, setPageNumber }) => {
    const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const safe = Math.min(pageNumber, pages);
    const from = totalCount === 0 ? 0 : (safe - 1) * PAGE_SIZE + 1;
    const to = Math.min(totalCount, safe * PAGE_SIZE);
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-800">{from}</span>–<span className="font-semibold text-slate-800">{to}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalCount}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={safe <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-800">{safe}</span> of{" "}
            <span className="font-semibold text-slate-800">{pages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(pages, p + 1))}
            disabled={safe >= pages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
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
              <FileText size={18} />
              System Logs
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
              {showLogout ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronUp size={18} />
              )}
            </button>
          </div>
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
                className={`w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
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
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page header: title + count + download report */}
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">
                  Transaction History
                </h1>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {stats.total} transaction{stats.total !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                All item requests across departments. Filter by date, department, or search.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <FileDown size={18} className="text-[#002B7F]" />
              <span className="text-sm font-medium text-slate-700">Report</span>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-1 focus:ring-[#002B7F]"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-1 focus:ring-[#002B7F]"
              >
                {Array.from({ length: 6 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loadingReport}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition ${
                  loadingReport ? "cursor-not-allowed bg-slate-400" : "bg-[#f97316] hover:bg-orange-600"
                }`}
              >
                {loadingReport ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FileDown size={14} />
                )}
                {loadingReport ? "Generating…" : "Generate PDF"}
              </button>
            </div>
          </header>

          {/* Toolbar: search + filters + view */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by staff, item, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20 lg:w-48"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays size={16} className="text-slate-500" />
              {[
                { value: "all", label: "All time" },
                { value: "thisMonth", label: "This month" },
                { value: "thisYear", label: "This year" },
                { value: "custom", label: "Custom" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriodPreset(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    periodPreset === value
                      ? "bg-[#002B7F] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
              {periodPreset === "custom" && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
                  <select
                    value={customMonth}
                    onChange={(e) => setCustomMonth(e.target.value)}
                    className="border-0 bg-transparent py-0 text-slate-700 focus:ring-0"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("en", { month: "short" })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={customYear}
                    onChange={(e) => setCustomYear(Number(e.target.value))}
                    className="border-0 bg-transparent py-0 text-slate-700 focus:ring-0"
                  >
                    {Array.from({ length: 6 }, (_, i) => (
                      <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setPeriodPreset("all");
                  setCustomMonth("");
                  setCustomYear(new Date().getFullYear());
                  setDepartmentFilter("");
                  setSearchQuery("");
                }}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <button
                onClick={() => setViewMode("all")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === "all" ? "bg-[#002B7F] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <LayoutList size={16} />
                All
              </button>
              <button
                onClick={() => setViewMode("byDept")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === "byDept" ? "bg-[#002B7F] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Layers size={16} />
                By dept
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingSkeleton />
          ) : filteredRequests.length === 0 ? (
            <EmptyState />
          ) : viewMode === "all" ? (
            <div className="space-y-4">
              <PaginationBar totalCount={total} pageNumber={page} setPageNumber={setPage} />
              <TransactionTable requests={pagedRequests} showDepartment={true} />
              {totalPages > 1 && (
                <PaginationBar totalCount={total} pageNumber={page} setPageNumber={setPage} />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDept)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dept, reqs]) => (
                  <div key={dept} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                      <h2 className="text-base font-semibold text-[#002B7F]">
                        {dept}
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          · {reqs.length} transaction{reqs.length !== 1 ? "s" : ""}
                        </span>
                      </h2>
                    </div>
                    <TransactionTable
                      requests={reqs}
                      showDepartment={false}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminRequests;
