import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Archive,
  Home,
  Package,
  ClipboardList,
  Calendar,
  UserCog,
  ChevronUp,
  ChevronDown,
  LogOut,
  RotateCcw,
  FileText,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";

import { API_URL } from "../../config/api";
const API_ITEMS = `${API_URL}/items`;
const API_USERS = `${API_URL}/users`;

const SuperAdminArchivedRecords = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  const [activeTab, setActiveTab] = useState("items"); // items | users

  const [archivedItems, setArchivedItems] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // Restore confirmation (replaces window.confirm) – { type: 'item'|'user', record }
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [restoring, setRestoring] = useState(false);
  

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

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

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  /** -----------------------
   * Fetch Archived Items
   ------------------------ */
  const fetchArchivedItems = async () => {
    try {
      const res = await fetch(`${API_ITEMS}?archived=true`);
      const data = await res.json();
      setArchivedItems(data);
    } catch (err) {
      toast.error("Error loading archived items");
    }
  };

  /** -----------------------
   * Fetch Archived Users
   ------------------------ */
  const fetchArchivedUsers = async () => {
    try {
      const res = await fetch(`${API_USERS}?archived=true`);
      const data = await res.json();
      setArchivedUsers(data);
    } catch (err) {
      toast.error("Error loading archived users");
    }
  };

  /** Open restore confirmation (replaces window.confirm) */
  const openRestoreConfirm = (type, record) => {
    setRestoreConfirm({ type, record });
  };

  /** Perform restore after user confirms */
  const handleRestoreConfirm = async () => {
    if (!restoreConfirm) return;
    const { type, record } = restoreConfirm;
    const id = record._id;
    setRestoring(true);
    try {
      if (type === "item") {
        const res = await fetch(`${API_ITEMS}/unarchive/${id}`, { method: "PUT" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success("Item restored!");
        fetchArchivedItems();
      } else {
        const res = await fetch(`${API_URL}/users/unarchive/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success("Staff restored successfully!");
        fetchArchivedUsers();
      }
      setRestoreConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error(type === "item" ? "Error restoring item" : "Failed to restore staff");
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchArchivedItems(), fetchArchivedUsers()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
      const stored = localStorage.getItem("userName");
      if (stored) setUserName(stored);
    }, []);
    
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            COT Inventory
          </h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Super Admin Portal
          </p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link
              to="/super-admin/requests"
              className={getLinkClass("/super-admin/requests")}
            >
              <ClipboardList size={18} /> Request Log
            </Link>
            <Link
              to="/super-admin/manage-inventory"
              className={getLinkClass("/super-admin/manage-inventory")}
            >
              <Package size={18} /> Manage Inventory
            </Link>
            <Link
              to="/super-admin/calendar-alerts"
              className={getLinkClass("/super-admin/calendar-alerts")}
            >
              <Calendar size={18} /> Calendar Alerts
            </Link>
            <Link
              to="/super-admin/archived-records"
              className={getLinkClass("/super-admin/archived-records")}
            >
              <Archive size={18} /> Archived Records
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
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName || "Super Admin"}</p>
                <p className="text-xs opacity-70 text-white mb-3">
                  College of Technology
                </p>
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

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#0a2a66] mb-6">
          Archived Records
        </h1>

        {/* ---------- TABS ---------- */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-6 py-2 rounded-lg font-medium ${
              activeTab === "items"
                ? "bg-[#002B7F] text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            Archived Items
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-2 rounded-lg font-medium ${
              activeTab === "users"
                ? "bg-[#002B7F] text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            Archived Users
          </button>
        </div>

        {/* ---------- CONTENT ---------- */}
        {loading ? (
          <p>Loading...</p>
        ) : activeTab === "items" ? (
          <ArchivedItemsSection
            archived={archivedItems}
            onRestore={(item) => openRestoreConfirm("item", item)}
          />
        ) : (
          <ArchivedUsersSection
            archived={archivedUsers}
            onRestore={(user) => openRestoreConfirm("user", user)}
          />
        )}
      </main>

      {/* --- RESTORE CONFIRMATION (replaces window.confirm) --- */}
      {restoreConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !restoring && setRestoreConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-dialog-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <RotateCcw size={24} />
              </div>
              <h2 id="restore-dialog-title" className="text-xl font-semibold text-gray-800">
                {restoreConfirm.type === "item" ? "Restore item?" : "Restore staff member?"}
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              {restoreConfirm.type === "item" ? (
                <>
                  Are you sure you want to restore <strong>{restoreConfirm.record.name}</strong>? It will appear in Manage Inventory again.
                </>
              ) : (
                <>
                  Are you sure you want to restore <strong>{restoreConfirm.record.name || restoreConfirm.record.email}</strong>? They will appear in Manage Users again.
                </>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => !restoring && setRestoreConfirm(null)}
                disabled={restoring}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreConfirm}
                disabled={restoring}
                className="px-4 py-2 rounded-lg bg-[#002B7F] text-white hover:bg-[#001F5A] disabled:opacity-50 flex items-center gap-2"
              >
                {restoring ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Restoring…
                  </>
                ) : (
                  "Restore"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** ---------------------------
 * Archived ITEMS Section
 ------------------------------ */
const ArchivedItemsSection = ({ archived, onRestore }) => {
  if (archived.length === 0)
    return <p className="text-gray-500">No archived items.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {archived.map((item) => (
        <div
          key={item._id}
          className="bg-white p-5 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition flex flex-col justify-between h-full"
        >
          <div>
            <h3 className="text-[15px] font-semibold mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600">{item.category}</p>
            <p className="text-sm text-gray-600 mt-1">
              Qty: <strong>{item.quantity}</strong> {item.unit}
            </p>
          </div>

          <button
            onClick={() => onRestore(item)}
            className="w-full py-2 mt-3 rounded-lg text-sm text-white font-medium bg-[#0b347a] hover:bg-[#0a2a66]"
          >
            <RotateCcw size={14} className="inline mr-2" /> Restore
          </button>
        </div>
      ))}
    </div>
  );
};

/** ---------------------------
 * Archived USERS Section
 ------------------------------ */
const ArchivedUsersSection = ({ archived, onRestore }) => {
  if (archived.length === 0)
    return <p className="text-gray-500">No archived users.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {archived.map((user) => (
        <div
          key={user._id}
          className="bg-white p-5 rounded-2xl shadow-md border hover:shadow-lg transition"
        >
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
          <p className="text-sm text-gray-600">Role: {user.role}</p>
          <p className="text-sm text-gray-600">Dept: {user.department}</p>

          <button
            onClick={() => onRestore(user)}
            className="w-full mt-3 py-2 bg-[#0a2a66] text-white rounded-lg hover:bg-[#072051]"
          >
            <RotateCcw size={14} className="inline mr-2" />
            Restore User
          </button>
        </div>
      ))}
    </div>
  );
};

export default SuperAdminArchivedRecords;
