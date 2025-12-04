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
} from "lucide-react";
import { toast } from "react-toastify";

const API_ITEMS = "http://localhost:5000/api/items";
const API_USERS = "http://localhost:5000/api/users";

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

  /** -----------------------
   * Restore Item
   ------------------------ */
  const restoreItem = async (id) => {
    if (!window.confirm("Restore this item?")) return;

    try {
      const res = await fetch(`${API_ITEMS}/unarchive/${id}`, {
        method: "PUT",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Item restored!");
      fetchArchivedItems();
    } catch (err) {
      toast.error("Error restoring item");
    }
  };

  /** -----------------------
   * Restore User
   ------------------------ */
  // const restoreUser = async (id) => {
  //   if (!window.confirm("Restore this user?")) return;

  //   try {
  //     const res = await fetch(`${API_USERS}/unarchive/${id}`, {
  //       method: "PUT",
  //     });

  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.message);

  //     toast.success("User restored!");
  //     fetchArchivedUsers();
  //   } catch (err) {
  //     toast.error("Error restoring user");
  //   }
  // };
  const restoreUser = async (id) => {
      if (!window.confirm("Restore this staff member?")) return;
  
      try {
        const res = await fetch(`http://localhost:5000/api/users/unarchive/${id}`, { 
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
  
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
  
        toast.success("Staff restored successfully!");
        fetchArchivedUsers();
      } catch (err) {
        console.error(err);
        toast.error("Failed to restore staff");
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
            restoreItem={restoreItem}
          />
        ) : (
          <ArchivedUsersSection
            archived={archivedUsers}
            restoreUser={restoreUser}
          />
        )}
      </main>
    </div>
  );
};

/** ---------------------------
 * Archived ITEMS Section
 ------------------------------ */
const ArchivedItemsSection = ({ archived, restoreItem }) => {
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
            onClick={() => restoreItem(item._id)}
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
const ArchivedUsersSection = ({ archived, restoreUser }) => {
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
            onClick={() => restoreUser(user._id)}
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
