import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";
import {
  Home,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  LogOut,
  User,
  Users,
  Settings,
  Clock,
  Archive,
  Search,
  CalendarDays,
  FileDown,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "react-toastify";
import { logout } from "../../utils/auth";

const shortId = (id) => (id ? String(id).slice(-8).toUpperCase() : "—");

const DepartmentAdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [department, setDepartment] = useState("");
  const [userName, setUserName] = useState("");
  const [periodPreset, setPeriodPreset] = useState("all");
  const [customMonth, setCustomMonth] = useState("");
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [loadingReport, setLoadingReport] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedName = localStorage.getItem("userName");
    const storedDept = localStorage.getItem("department");
    if (storedUser) {
      setUserName(storedUser.name || storedUser.username || "User");
      if (storedUser.department) setDepartment(storedUser.department);
    }
    if (storedName && !userName) setUserName(storedName);
    if (storedDept && !department) setDepartment(storedDept);
  }, []);

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
    if (!department) return;
    const fetchRequests = async () => {
      try {
        setLoading(true);
        let url = `${API_URL}/requests/department/${encodeURIComponent(department)}`;
        const params = [];
        if (dateParams.month) params.push(`month=${dateParams.month}`);
        if (dateParams.year) params.push(`year=${dateParams.year}`);
        if (dateParams.day) params.push(`day=${dateParams.day}`);
        if (params.length > 0) url += "?" + params.join("&");

        const res = await fetch(url);
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching department requests:", err);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [department, dateParams.month, dateParams.year, dateParams.day]);

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
        ? "bg-white text-[#0a2a66] font-semibold"
        : "text-white hover:bg-white/10"
    }`;

  const handleGenerateReport = async () => {
    if (!reportMonth || !reportYear) {
      toast.warning("Please select both month and year for the report.");
      return;
    }
    if (!department) {
      toast.warning("Department not found. Please sign in again.");
      return;
    }
    setLoadingReport(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/reports/department/${encodeURIComponent(department)}?month=${reportMonth}&year=${reportYear}`;
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

  const isPendingStatus = (status) => status === "Pending";
  const isApprovedStatus = (status) => status === "Approved" || status === "Successful";
  const isRejectedStatus = (status) =>
    status === "Rejected" || status === "Unsuccessful" || status === "Canceled";

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === "pending" && !isPendingStatus(req.status)) return false;
      if (statusFilter === "approved" && !isApprovedStatus(req.status)) return false;
      if (statusFilter === "rejected" && !isRejectedStatus(req.status)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (req.requestedBy || "").toLowerCase().includes(q);
        const matchItem = (req.itemName || "").toLowerCase().includes(q);
        if (!matchName && !matchItem) return false;
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const successful = filteredRequests.filter((r) => isApprovedStatus(r.status)).length;
    const pending = filteredRequests.filter((r) => isPendingStatus(r.status)).length;
    const unsuccessful = filteredRequests.filter((r) => isRejectedStatus(r.status)).length;
    return { total, successful, pending, unsuccessful };
  }, [filteredRequests]);

  const summaryStats = useMemo(() => {
    const total = requests.length;
    const successful = requests.filter((r) => isApprovedStatus(r.status)).length;
    const pending = requests.filter((r) => isPendingStatus(r.status)).length;
    const unsuccessful = requests.filter((r) => isRejectedStatus(r.status)).length;
    return { total, successful, pending, unsuccessful };
  }, [requests]);

  useEffect(() => {
    setPage(1);
  }, [periodPreset, customMonth, customYear, searchQuery, statusFilter]);

  const total = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedRequests = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, safePage]);

  const getStatusStyle = (status) => {
    if (isApprovedStatus(status))
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (isRejectedStatus(status))
      return "bg-red-50 text-red-700 border-red-200";
    if (isPendingStatus(status))
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const PaginationBar = ({ totalCount, pageNumber, setPageNumber }) => {
    const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const safe = Math.min(pageNumber, pages);
    const from = totalCount === 0 ? 0 : (safe - 1) * PAGE_SIZE + 1;
    const to = Math.min(totalCount, safe * PAGE_SIZE);

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-800">{from}</span>-<span className="font-semibold text-slate-800">{to}</span> of <span className="font-semibold text-slate-800">{totalCount}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={safe <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-800">{safe}</span> of <span className="font-semibold text-slate-800">{pages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(pages, p + 1))}
            disabled={safe >= pages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const TransactionTable = ({ list }) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-4 py-3.5">Transaction ID</th>
            <th className="px-4 py-3.5">Date & time</th>
            <th className="px-4 py-3.5">Type</th>
            <th className="px-4 py-3.5">Requested by</th>
            <th className="px-4 py-3.5">Item</th>
            <th className="px-4 py-3.5 text-right">Qty</th>
            <th className="px-4 py-3.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((req) => (
            <tr key={req._id} className="transition-colors hover:bg-slate-50/50">
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
                  {isApprovedStatus(req.status) ? (
                    <CheckCircle2 size={12} />
                  ) : isPendingStatus(req.status) ? (
                    <Clock size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {req.status}
                </span>
                {isRejectedStatus(req.status) && req.rejectionReason ? (
                  <p className="mt-1 max-w-[240px] text-[11px] leading-snug text-red-700">{req.rejectionReason}</p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
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
        {searchQuery || periodPreset !== "all"
          ? "Try adjusting your filters or period."
          : `Staff requests for ${department || "your department"} will appear here.`}
      </p>
    </div>
  );

  if (!department) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading department...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Dept. Admin Portal
          </p>
          <nav className="space-y-2">
            <Link to="/department-admin" className={getLinkClass("/department-admin")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link to="/department-admin/users" className={getLinkClass("/department-admin/users")}>
              <Users size={18} /> Manage Staff
            </Link>
            <Link to="/department-admin/requests" className={getLinkClass("/department-admin/requests")}>
              <ClipboardList size={18} /> Request Log
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
                <Settings size={16} /> Settings
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
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Request Log</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {summaryStats.total} request{summaryStats.total !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Monitor department request activity, track pending items, and review successful and rejected transactions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">Pending: {summaryStats.pending}</span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">Approved: {summaryStats.successful}</span>
                  <span className="rounded-full border border-[#dbe7ff] bg-[#f4f8ff] px-3 py-1 text-xs font-semibold text-[#334155]">Rejected/Canceled: {summaryStats.unsuccessful}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileDown size={16} className="text-[#002B7F]" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Export</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-1 focus:ring-[#002B7F]"
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
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-1 focus:ring-[#002B7F]"
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
                </div>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white transition ${
                    loadingReport ? "cursor-not-allowed bg-slate-400" : "bg-[#f97316] hover:bg-orange-600"
                  }`}
                >
                  {loadingReport ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FileDown size={14} />
                  )}
                  {loadingReport ? "Generating..." : "Generate PDF"}
                </button>
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-start">
              <div className="space-y-3">
                <label className="relative block">
                  <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by staff or item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-[#dbe7ff] bg-white py-3 pl-10 pr-4 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-[#002B7F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002B7F]/15"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#f4f8ff] px-2 py-2">
                    <CalendarDays size={14} className="ml-1 text-slate-400" />
                    {[
                      { value: "all", label: "All time" },
                      { value: "thisMonth", label: "Month" },
                      { value: "thisYear", label: "Year" },
                      { value: "custom", label: "Custom" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPeriodPreset(value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          periodPreset === value ? "bg-[#002B7F] text-white" : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodPreset("all");
                      setCustomMonth("");
                      setCustomYear(new Date().getFullYear());
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                    className="rounded-full border border-[#dbe7ff] bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-[#f4f8ff]"
                  >
                    Clear filters
                  </button>

                  {periodPreset === "custom" && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <select
                        value={customMonth}
                        onChange={(e) => setCustomMonth(e.target.value)}
                        className="border-0 bg-transparent py-0 pl-0 pr-4 text-slate-700 focus:ring-0"
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
                        className="border-0 bg-transparent py-0 pl-0 pr-0 text-slate-700 focus:ring-0"
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
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#dbe7ff] bg-[#f4f8ff] p-2 sm:grid-cols-4">
                  {[
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        statusFilter === option.value ? "bg-[#002B7F] text-white shadow-sm" : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[#1e3a8a]">Filtered: {stats.total}</span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-[#1d4ed8]">Pending: {stats.pending}</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Approved: {stats.successful}</span>
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">Rejected: {stats.unsuccessful}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <LoadingSkeleton />
          ) : filteredRequests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              <PaginationBar totalCount={total} pageNumber={page} setPageNumber={setPage} />
              <TransactionTable list={pagedRequests} />
              {totalPages > 1 && (
                <PaginationBar totalCount={total} pageNumber={page} setPageNumber={setPage} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DepartmentAdminRequests;
