import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  History,
  LogOut,
  ChevronUp,
  ChevronDown,
  User,
  Search,
  XCircle,
  Settings,
  Package,
} from "lucide-react";
import { toast } from "react-toastify";
import { API_URL } from "../../config/api";
import { logout } from "../../utils/auth";

/** Title-case for display (e.g. "HOME SUPPLY" -> "Home Supply") */
const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return str;
  return str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Unique categories from items, case-insensitive (one canonical string per category) */
const getCanonicalCategories = (itemsList) => {
  const seen = new Map();
  for (const item of itemsList) {
    const cat = item.category;
    if (!cat) continue;
    const key = cat.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, cat.trim());
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
};

const StaffRequestItems = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); //for modal
  const [quantity, setQuantity] = useState(1); // for quantity input
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);



  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  

  // Load user info
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUserName(storedUser.name);
      setDepartment(storedUser.department);
      setUserId(storedUser._id);
    }
  }, []);

  // Fetch all items
  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/items`);
      const data = await res.json();
      setItems(data);
      setFilteredItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Categories from inventory (reflects super admin–added categories)
  const categories = ["All", ...getCanonicalCategories(items)];

  // Search + filter logic (case-insensitive category match)
  useEffect(() => {
    let result = items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filterCategory && filterCategory !== "All") {
      const key = filterCategory.trim().toLowerCase();
      result = result.filter(
        (item) => (item.category || "").trim().toLowerCase() === key
      );
    }
    setFilteredItems(result);
  }, [search, filterCategory, items]);

  //  Show modal
  const handleRequest = (item) => {
    setSelectedItem(item);
    setQuantity(1);
  };

  const handleSubmitRequest = async () => {
    if (!selectedItem || submitLoading) return;

    if (quantity <= 0) {
      toast.warning("Please enter a valid quantity.");
      return;
    }

    setSubmitLoading(true); // ⛔ lock button

    try {
        const res = await fetch(`${API_URL}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          itemId: selectedItem._id,
          itemName: selectedItem.name,
          department,
          requestedBy: userName,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Request for "${selectedItem.name}" submitted and pending superadmin approval.`);
        setSelectedItem(null);
        await fetchItems();
      } else {
        toast.error(data.message || "Request failed");
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Server error while submitting request.");
    } finally {
      setSubmitLoading(false); // 🔓 unlock button
    }
  };


  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-semibold"
        : "text-white hover:bg-white/10"
    }`;

  const getStatus = (quantity) => {
    if (quantity === 0)
      return { text: "Out of Stock", color: "border border-red-100 bg-red-50 text-red-700" };
    if (quantity <= 10)
      return { text: "Limited", color: "border border-amber-100 bg-amber-50 text-amber-700" };
    return { text: "Available", color: "border border-emerald-100 bg-emerald-50 text-emerald-700" };
  };

  const total = filteredItems.length;

  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
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


  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
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
                <p className="text-sm font-medium text-white mb-1">{userName || "Staff"}</p>
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
                onClick={() => navigate("/staff/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2"
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={` w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
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
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Request Items</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {total} item{total !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Browse inventory items, filter by category, and submit request entries for approval.
                </p>
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-[#dbe7ff] bg-white py-3 pl-10 pr-4 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-[#002B7F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002B7F]/15"
                />
              </label>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="min-w-[170px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All categories" : toTitleCase(cat)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Package className="text-slate-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No items found</h3>
              <p className="mt-1 text-sm text-slate-500">Try a different search or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const status = getStatus(item.quantity);
                return (
                  <div
                    key={item._id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-800">
                          {item.name}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}
                        >
                          {status.text}
                        </span>
                      </div>
                      <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
                        <Package size={14} className="shrink-0" />
                        <span>{toTitleCase(item.category)}</span>
                      </div>
                      <p className="mb-4 text-[13px] text-slate-600">
                        <strong className="text-slate-700">Available:</strong>{" "}
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => handleRequest(item)}
                        disabled={item.quantity === 0}
                        className={`w-full rounded-xl py-2.5 text-sm font-medium transition ${
                          item.quantity === 0
                            ? "cursor-not-allowed bg-gray-200 text-gray-500"
                            : "bg-[#0b347a] text-white hover:bg-[#0a2a66]"
                        }`}
                      >
                        + Request Item
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-2 pt-6">
              <h2 className="text-lg font-semibold text-slate-900">Request Item</h2>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-1 font-medium text-slate-800">{selectedItem.name}</p>
              <p className="mb-6 text-sm text-slate-500">
                {toTitleCase(selectedItem.category)} · {selectedItem.quantity} {selectedItem.unit} available
              </p>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max={selectedItem.quantity}
                value={quantity}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setQuantity(value >= 1 ? value : 1);
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 transition focus:border-[#0a2a66] focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20"
              />

              {quantity > selectedItem.quantity && (
                <p className="mt-2 text-sm text-red-600">
                  Quantity exceeds available stock.
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={
                    submitLoading ||
                    quantity > selectedItem.quantity ||
                    quantity <= 0
                  }
                  className={`px-4 py-2.5 rounded-xl font-medium transition ${
                    submitLoading ||
                    quantity > selectedItem.quantity ||
                    quantity <= 0
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : "bg-[#0b347a] text-white hover:bg-[#0a2a66]"
                  }`}
                >
                  {submitLoading ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};


export default StaffRequestItems;
