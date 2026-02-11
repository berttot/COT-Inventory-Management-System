import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Loader2,
  User,
  PlusCircle,
  Pencil,
  Home,
  ClipboardList,
  UserCog,
  ChevronDown,
  ChevronUp,
  LogOut,
  Package,
  Calendar,
  Archive,
  FileText,
  Settings,
  X,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";
import { API_URL } from "../../config/api";

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showLogout, setShowLogout] = useState(false);
  const location = useLocation();
  const [sendingInvite, setSendingInvite] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // Archive confirmation (replaces window.confirm)
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // table controls
  const departments = useMemo(
    () => ["Information Technology", "Automotive Technology", "Electronics Technology", "EMC"],
    []
  );
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRole, setSelectedRole] = useState("all"); // all | departmentadmin | staff
  // Default sort: higher-privilege roles first (Dept Admin above Staff)
  const [sortConfig, setSortConfig] = useState({ key: "role", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const initialForm = useMemo(
    () => ({
      accessID: "",
      name: "",
      email: "",
      department: "",
      role: "staff",
      password: "",
    }),
    []
  );
  const [form, setForm] = useState(initialForm);

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


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  

 // ✅ CREATE USER
const handleInviteUser = async (e) => {
  e.preventDefault();
  setSendingInvite(true);

  const token = localStorage.getItem("token"); // 🔥 GET token

  try {
    const response = await fetch(`${API_URL}/invite`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}) // 🔥 SEND token
      },
      body: JSON.stringify({ 
        email: form.email, 
        role: "departmentadmin" 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send invite");
    }

    toast.success("Invitation email sent successfully!");
    setShowModal(false);
    setForm((prev) => ({ ...prev, email: "" }));
  } catch (err) {
    console.error(err);
    toast.error(err.message || "Error sending invite");
  } finally {
    setSendingInvite(false);
  }
};


  // ✅ FETCH USERS
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/users?archived=false`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users.");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setFetchError(err.message || "Failed to load users.");
      toast.error(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);

    fetchUsers();

    const eventSource = new EventSource(`${API_URL}/users/locks/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update the specific user in UI
        if (data.type === "lock") {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === data.userId
                ? { ...u, lockedBy: data.lockedBy, lockExpiresAt: data.expiresAt }
                : u
            )
          );
        }

        if (data.type === "unlock") {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === data.userId
                ? { ...u, lockedBy: null, lockExpiresAt: null }
                : u
            )
          );
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    // Cleanup
    return () => eventSource.close();
  }, [fetchUsers]);

  // Close modals via Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (archiving || sendingInvite || updatingUser) return;
      if (archiveConfirm) setArchiveConfirm(null);
      if (showModal) setShowModal(false);
      if (showEditModal) {
        // Close edit modal safely (unlock)
        (async () => {
          try {
            const adminName = localStorage.getItem("userName");
            if (editUser?._id) {
              await fetch(`${API_URL}/users/unlock/${editUser._id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminName }),
              });
            }
          } catch (err) {
            console.warn("Failed to unlock user:", err);
          } finally {
            setShowEditModal(false);
            setEditUser(null);
          }
        })();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiveConfirm, showModal, showEditModal, archiving, sendingInvite, updatingUser, editUser]);

  // Open archive confirmation (replaces window.confirm)
  const openArchiveConfirm = (user) => {
    setArchiveConfirm({ id: user._id, name: user.name || user.accessID || "this user" });
  };

  // Perform archive after user confirms
  const handleArchiveUser = async () => {
    if (!archiveConfirm) return;
    const id = archiveConfirm.id;
    setArchiving(true);
    try {
      const response = await fetch(`${API_URL}/users/archive/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to archive user");

      setUsers((prev) => prev.filter((u) => u._id !== id));
      setArchiveConfirm(null);
      toast.success("User archived successfully! They can be restored from Archived Records.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error archiving user");
    } finally {
      setArchiving(false);
    }
  };


  // ✅ EDIT USER
 const handleEditClick = async (user) => {
    const adminName = localStorage.getItem("userName");

    const res = await fetch(`${API_URL}/users/lock/${user._id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminName }),
    });

    if (!res.ok) {
      const msg = await res.json();
      toast.error(msg.message);
      return;
    }

    setEditUser(user);
    setForm(user);
    setShowEditModal(true);
  };


  const handleUpdateUser = async (e) => {
  e.preventDefault();
  

  // Only send editable fields
  const updateData = {
    department: form.department,
    role: form.role,
  };

  try {
    setUpdatingUser(true);
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${API_URL}/users/${editUser._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) throw new Error("Failed to update user");

    const updatedUser = await response.json();
    setUsers((prev) => prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
    setShowEditModal(false);
    setEditUser(null);

    toast.success("User updated successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Error updating user");
  } finally {
    try {
      await fetch(`${API_URL}/users/unlock/${editUser._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName: localStorage.getItem("userName") }),
      });
    } catch (err) {
      console.warn("Failed to unlock user:", err);
    } finally {
      setUpdatingUser(false);
    }
  }

};

  const closeEditModal = async () => {
    if (!editUser?._id) {
      setShowEditModal(false);
      setEditUser(null);
      return;
    }
    if (updatingUser) return;

    try {
      setUpdatingUser(true);
      const adminName = localStorage.getItem("userName");
      await fetch(`${API_URL}/users/unlock/${editUser._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName }),
      });
    } catch (err) {
      console.warn("Failed to unlock user:", err);
    } finally {
      setUpdatingUser(false);
      setShowEditModal(false);
      setEditUser(null);
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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.role !== "superadmin")
      .filter((u) => (selectedDepartment === "All" ? true : u.department === selectedDepartment))
      .filter((u) => (selectedRole === "all" ? true : u.role === selectedRole))
      .filter((u) => {
        if (!q) return true;
        const name = (u.name || "").toLowerCase();
        const accessID = (u.accessID || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const role = (u.role || "").toLowerCase();
        const dept = (u.department || "").toLowerCase();
        return (
          name.includes(q) ||
          accessID.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          dept.includes(q)
        );
      });
  }, [users, search, selectedDepartment, selectedRole]);

  const sortedUsers = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    const roleRank = (role) => {
      // smaller = higher priority
      if (role === "departmentadmin") return 0;
      if (role === "staff") return 1;
      return 99;
    };

    const getValue = (u) => {
      if (key === "accessID") return u.accessID || "";
      if (key === "email") return u.email || "";
      if (key === "role") return u.role || "";
      if (key === "department") return u.department || "";
      return u.name || "";
    };

    return [...filteredUsers].sort((a, b) => {
      // Role sorting is priority-based (not alphabetical)
      if (key === "role") {
        const ra = roleRank(a.role);
        const rb = roleRank(b.role);
        if (ra !== rb) return (ra - rb) * dir;

        // within same role: name A→Z for readability
        const na = String(a.name || "").toLowerCase();
        const nb = String(b.name || "").toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        const aa = String(a.accessID || "").toLowerCase();
        const ab = String(b.accessID || "").toLowerCase();
        if (aa < ab) return -1;
        if (aa > ab) return 1;
        return 0;
      }

      // Default: string compare for the selected key
      const va = String(getValue(a)).toLowerCase();
      const vb = String(getValue(b)).toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;

      // Tie-break: role priority, then name, then accessID (stable-ish ordering)
      const ra = roleRank(a.role);
      const rb = roleRank(b.role);
      if (ra !== rb) return ra - rb;
      const na = String(a.name || "").toLowerCase();
      const nb = String(b.name || "").toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      const aa = String(a.accessID || "").toLowerCase();
      const ab = String(b.accessID || "").toLowerCase();
      if (aa < ab) return -1;
      if (aa > ab) return 1;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const total = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, selectedDepartment, selectedRole, sortConfig.key, sortConfig.direction, pageSize]);

  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, safePage, pageSize]);

  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(total, safePage * pageSize);

  const roleBadgeClass = (role) => {
    if (role === "departmentadmin") {
      return "bg-[#FF7701]/10 text-[#FF7701] border border-[#FF7701]/30";
    }
    return "bg-[#F9FBFF] text-[#002879] border border-[#002879]/20";
  };

  // --- UI ---
  return (
    <div className="flex h-screen bg-gray-50">
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
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#0a2a66] flex items-center gap-2">
              <User size={26} /> Manage Users
            </h2>
            <p className="text-gray-600">
              Add, update, or remove users and assign roles.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-[#0b347a] transition"
            >
              <PlusCircle size={18} /> Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <input
                type="text"
                placeholder="Search by name, email, access ID, role, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                aria-label="Search users"
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

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Department</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  aria-label="Filter by department"
                >
                  <option value="All">All</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Role</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  aria-label="Filter by role"
                >
                  <option value="all">All</option>
                  <option value="departmentadmin">Department Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <span className="ml-3 text-gray-600 text-lg">Loading users...</span>
          </div>
        ) : fetchError ? (
          <div className="bg-white border border-red-100 rounded-2xl p-6 text-red-700 shadow-sm">
            <p className="font-semibold mb-1">Couldn’t load users</p>
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-[#002B7F]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-white">Users</h3>
                <div className="text-xs text-white/80">
                  Showing <span className="font-semibold text-white">{showingFrom}</span>–<span className="font-semibold text-white">{showingTo}</span> of{" "}
                  <span className="font-semibold text-white">{total}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[980px]">
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
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase">
                      <button
                        type="button"
                        onClick={() => requestSort("role")}
                        className="inline-flex items-center hover:text-gray-900"
                        aria-label="Sort by role"
                      >
                        Role{sortIndicator("role")}
                      </button>
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase">
                      <button
                        type="button"
                        onClick={() => requestSort("department")}
                        className="inline-flex items-center hover:text-gray-900"
                        aria-label="Sort by department"
                      >
                        Department{sortIndicator("department")}
                      </button>
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase">Status</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.length > 0 ? (
                    pagedUsers.map((u) => {
                      const lockedByOther = !!(u.lockedBy && u.lockedBy !== userName);
                      return (
                        <tr key={u._id} className="border-b hover:bg-blue-50 transition duration-150">
                          <td className="p-3 font-medium text-gray-700">{u.accessID}</td>
                          <td className="p-3 text-gray-700">{u.name}</td>
                          <td className="p-3 text-gray-700">{u.email || "-"}</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleBadgeClass(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">{u.department || "-"}</td>
                          <td className="p-3">
                            {lockedByOther ? (
                              <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                <Lock size={14} />
                                Locked by {u.lockedBy}
                              </span>
                            ) : u.lockedBy ? (
                              <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
                                <Lock size={14} />
                                Locked by you
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">Available</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-3">
                              <button
                                disabled={lockedByOther}
                                onClick={() => handleEditClick(u)}
                                className={`text-blue-600 hover:text-blue-800 ${
                                  lockedByOther ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                aria-label={`Edit ${u.name || u.accessID || "user"}`}
                                title={lockedByOther ? `Locked by ${u.lockedBy}` : "Edit user"}
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                disabled={lockedByOther}
                                onClick={() => openArchiveConfirm(u)}
                                className={`text-orange-600 hover:text-orange-800 ${
                                  lockedByOther ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                title={lockedByOther ? `Locked by ${u.lockedBy}` : "Archive user"}
                                aria-label={`Archive ${u.name || u.accessID || "user"}`}
                              >
                                <Archive size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500 italic">
                        {search.trim() || selectedDepartment !== "All" || selectedRole !== "all"
                          ? "No users match your filters."
                          : "No users found."}
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
        )}

      </main>

      {/* --- ADD USER MODAL --- */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4"
          onClick={() => !sendingInvite && setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-user-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 id="invite-user-title" className="text-2xl font-bold">
                Invite Department Admin
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
            <form onSubmit={handleInviteUser} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Enter user Gmail address"
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
                    sendingInvite ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4"
          onClick={() => !updatingUser && closeEditModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-user-title" className="text-2xl font-bold mb-4">
              Edit User
            </h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">

              {/* Editable fields */}
              <select
                name="department"
                value={form.department || ""}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select Department</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Automotive Technology">Automotive Technology</option>
                <option value="Electronics Technology">Electronics Technology</option>
                <option value="EMC">EMC</option>
              </select>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="departmentadmin">Department Admin</option>
                <option value="staff">Staff</option>
              </select>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={updatingUser}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingUser}
                  className="px-4 py-2 rounded-lg bg-[#002B7F] text-white hover:bg-[#001F5A]"
                >
                  {updatingUser ? "Updating..." : "Update"}
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
          aria-labelledby="archive-dialog-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Archive size={24} />
              </div>
              <h2 id="archive-dialog-title" className="text-xl font-semibold text-gray-800">
                Archive user?
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to archive <strong>{archiveConfirm.name}</strong>? They can be restored later from Archived Records.
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
                onClick={handleArchiveUser}
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

export default ManageUsers;
