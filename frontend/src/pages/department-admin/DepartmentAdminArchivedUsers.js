import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Users,
  Home,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  LogOut,
  RotateCcw,
  Archive,
  Settings,
} from "lucide-react";
import { toast } from "react-toastify";

const DepartmentAdminArchivedUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [archivedStaff, setArchivedStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once


  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

  // frontend snippet (all pages where handleLogout used)
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



  // Fetch archived users from same department
  const fetchArchived = async () => {
    try {
      const department = localStorage.getItem("department");

      const res = await fetch("http://localhost:5000/api/users?archived=true");
      const data = await res.json();

      const staffOnly = data.filter(
        (u) => u.role === "staff" && u.department === department
      );

      setArchivedStaff(staffOnly);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load archived users");
    } finally {
      setLoading(false);
    }
  };

  const restoreStaff = async (id) => {
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
      fetchArchived();
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore staff");
    }
  };

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "");
    setDepartment(localStorage.getItem("department") || "");
    fetchArchived();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">

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
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-3xl font-bold text-[#0a2a66] mb-6">Archived Staff</h1>

        {loading ? (
          <p>Loading...</p>
        ) : archivedStaff.length === 0 ? (
          <p className="text-gray-500">No archived staff found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedStaff.map((user) => (
              <div
                key={user._id}
                className="bg-white p-5 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[15px] font-semibold text-gray-800">
                      {user.name}
                    </h3>
                    <span className="text-[11px] font-medium bg-red-100 text-red-700 px-2.5 py-0.5 rounded-md">
                      Archived
                    </span>
                  </div>

                  <p className="text-[13px] text-gray-600">
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p className="text-[13px] text-gray-600">
                    <strong>Access ID:</strong> {user.accessID}
                  </p>
                </div>

                <button
                  onClick={() => restoreStaff(user._id)}
                  className="w-full mt-4 py-2.5 rounded-lg text-sm text-white font-medium bg-[#0a2a66] hover:bg-[#072051] transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> Restore Staff
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DepartmentAdminArchivedUsers;
