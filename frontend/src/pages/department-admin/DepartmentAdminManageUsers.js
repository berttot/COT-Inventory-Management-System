import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Loader2,
  User,
  PlusCircle,
  Home,
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  ClipboardList,
  Archive,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { API_URL } from "../../config/api";

const DepartmentAdminManageUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const [form, setForm] = useState({ email: "" });

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // Archive confirmation (replaces window.confirm)
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // table controls
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const storedDepartment = localStorage.getItem("department");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/users?archived=false`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch staff.");
      const data = await response.json();

      const staffInDept = data.filter(
        (u) => u.role === "staff" && u.department === storedDepartment
      );
      setUsers(staffInDept);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setFetchError(err.message || "Failed to load staff.");
      toast.error(err.message || "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  // frontend snippet (all pages where handleLogout used)
  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
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

      // Small delay for better UX
      setTimeout(() => {
        setLogoutLoading(false);
        navigate("/");
      }, 300);
    }
  };


  // 📨 Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


  // ✅ INVITE STAFF (auto-assign current admin's department)
  const handleInviteStaff = async (e) => {
    e.preventDefault();
    setSendingInvite(true);

    const token = localStorage.getItem("token"); // 🔥 GET TOKEN HERE

    try {
      if (!department) {
        throw new Error("Department not found. Please re-login and try again.");
      }
      const response = await fetch(`${API_URL}/invite`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}) // 🔥 SEND TOKEN
        },
        body: JSON.stringify({ 
          email: form.email, 
          role: "staff",
          department
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send invite");
      }

      toast.success("Staff invitation email sent successfully!");
      setShowModal(false);
      setForm({ email: "" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error sending invite");
    } finally {
      setSendingInvite(false);
    }
  };



  // ✅ FETCH STAFF USERS (only from the same department)
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedDepartment = localStorage.getItem("department");
    if (storedName) setUserName(storedName);
    if (storedDepartment) setDepartment(storedDepartment);
    fetchUsers();
  }, [fetchUsers]);

  // Close modals via Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (archiving) return;
      if (sendingInvite) return;
      if (archiveConfirm) setArchiveConfirm(null);
      if (showModal) setShowModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiveConfirm, showModal, archiving, sendingInvite]);


  /** Open archive confirmation (replaces window.confirm) */
  const openArchiveConfirm = (user) => {
    setArchiveConfirm({ id: user._id, name: user.name || user.accessID || "this staff member" });
  };

  /** Perform archive after user confirms */
  const handleArchiveStaff = async () => {
    if (!archiveConfirm) return;
    const id = archiveConfirm.id;
    setArchiving(true);
    try {
      const response = await fetch(`${API_URL}/users/archive/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to archive staff");

      setUsers((prev) => prev.filter((u) => u._id !== id));
      setArchiveConfirm(null);
      toast.success("Staff archived successfully! They can be restored from Archived Staff.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error archiving staff");
    } finally {
      setArchiving(false);
    }
  };

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return (
      <span className="ml-1 inline-block align-middle text-gray-400">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // ✅ Filter + sort + paginate staff
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const accessID = (u.accessID || "").toLowerCase();
      return name.includes(q) || email.includes(q) || accessID.includes(q);
    });
  }, [users, search]);

  const sortedUsers = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;
    const getValue = (u) => {
      if (key === "accessID") return u.accessID || "";
      if (key === "email") return u.email || "";
      return u.name || "";
    };
    return [...filteredUsers].sort((a, b) => {
      const va = String(getValue(a)).toLowerCase();
      const vb = String(getValue(b)).toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const total = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    // reset to first page on search/sort/pageSize changes
    setPage(1);
  }, [search, sortConfig.key, sortConfig.direction, pageSize]);

  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, safePage, pageSize]);

  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(total, safePage * pageSize);

  // ✅ Render staff table
  const renderTable = (data) => (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 mb-8 overflow-hidden">
      <div className="px-6 py-3 border-b bg-[#002B7F]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-white">
            {department} Department - Staff Members
          </h3>
          <div className="text-xs text-white/80">
            Showing <span className="font-semibold text-white">{showingFrom}</span>–<span className="font-semibold text-white">{showingTo}</span> of{" "}
            <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase">
              <button
                type="button"
                onClick={() => requestSort("accessID")}
                className="inline-flex items-center hover:text-gray-900"
                aria-label="Sort by access ID"
              >
                Access ID{sortIndicator("accessID")}
              </button>
            </th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase">
              <button
                type="button"
                onClick={() => requestSort("name")}
                className="inline-flex items-center hover:text-gray-900"
                aria-label="Sort by name"
              >
                Name{sortIndicator("name")}
              </button>
            </th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase">
              <button
                type="button"
                onClick={() => requestSort("email")}
                className="inline-flex items-center hover:text-gray-900"
                aria-label="Sort by email"
              >
                Email{sortIndicator("email")}
              </button>
            </th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((user) => (
              <tr key={user._id} className="border-b hover:bg-blue-50 transition duration-150">
                <td className="p-3 font-medium text-gray-700">{user.accessID}</td>
                <td className="p-3 text-gray-700">{user.name}</td>
                <td className="p-3 text-gray-700">{user.email}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => openArchiveConfirm(user)}
                    className="text-orange-600 hover:text-orange-800"
                    title="Archive staff"
                    aria-label={`Archive ${user.name || user.accessID || "staff member"}`}
                  >
                    <Archive size={18} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-8 text-gray-500 italic">
                {search.trim()
                  ? "No staff match your search."
                  : "No staff found in your department. Invite one to get started."}
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Rows per page"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-800">{safePage}</span> of{" "}
            <span className="font-semibold text-gray-800">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  // --- UI ---
  return (
    <div className="flex h-screen bg-gray-50">
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
            <Link to="/department-admin/users" className={getLinkClass("/department-admin/users")}>
              <Users size={18} />
              Manage Staff
            </Link>
            <Link to="/department-admin/requests" className={getLinkClass("/department-admin/requests")}>
              <ClipboardList size={18} />
              Request Log
            </Link>
            <Link to="/department-admin/archived-users" className={getLinkClass("/department-admin/archived-users")}>
              <Archive size={18} /> Archived Staff
            </Link>
          </nav>
        </div>

        {/* Bottom User Section */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            {/* Left section: icon + text */}
            <div className="flex items-center gap-2">
              <User size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department}</p>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#0a2a66] flex items-center gap-2">
              <User size={26} /> Manage Users
            </h2>
            <p className="text-gray-600">
              Add, update, or remove staff and assign roles.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <PlusCircle size={18} /> Add Staff
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-72"
                aria-label="Search staff by name, email, or access ID"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100 text-gray-500"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <span className="ml-3 text-gray-600 text-lg">Loading staff...</span>
          </div>
        ) : fetchError ? (
          <div className="bg-white border border-red-100 rounded-2xl p-6 text-red-700 shadow-sm">
            <p className="font-semibold mb-1">Couldn’t load staff</p>
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        ) : (
          renderTable(pagedUsers)
        )}
      </main>

      {/* --- ADD STAFF MODAL --- */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4"
          onClick={() => !sendingInvite && setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-staff-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 id="invite-staff-title" className="text-2xl font-bold">
                Invite Staff
              </h2>
              <button
                type="button"
                onClick={() => !sendingInvite && setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close invite modal"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Enter staff Gmail address"
                value={form.email}
                onChange={handleChange}
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={sendingInvite}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className={`px-4 py-2 rounded-lg text-white ${
                    sendingInvite
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ARCHIVE CONFIRMATION (replaces window.confirm) --- */}
      {archiveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !archiving && setArchiveConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-staff-dialog-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Archive size={24} />
              </div>
              <h2 id="archive-staff-dialog-title" className="text-xl font-semibold text-gray-800">
                Archive staff?
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to archive <strong>{archiveConfirm.name}</strong>? They can be restored later from Archived Staff.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => !archiving && setArchiveConfirm(null)}
                disabled={archiving}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveStaff}
                disabled={archiving}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
              >
                {archiving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Archiving…
                  </>
                ) : (
                  "Archive"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminManageUsers;
