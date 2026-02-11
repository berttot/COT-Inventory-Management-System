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
        toast.success(`Request for "${selectedItem.name}" successful!`);
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
      return { text: "Out of Stock", color: "bg-red-100 text-red-600" };
    if (quantity <= 10)
      return { text: "Limited", color: "bg-yellow-100 text-yellow-600" };
    return { text: "Available", color: "bg-green-100 text-green-600" };
  };

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


  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
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
                onClick={() => navigate("/staff/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2 mb-1"
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
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66]">Request Items</h1>
            <p className="text-gray-600 mt-1">Browse inventory and submit requests</p>
          </div>

          {/* Search + Category dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-[280px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-0 w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
              />
            </div>
            <div className="bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm min-w-[160px]">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="outline-none text-sm text-gray-900 pr-6 w-full bg-transparent focus:ring-0"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All categories" : toTitleCase(cat)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Item Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const status = getStatus(item.quantity);
            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition flex flex-col"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="text-[15px] font-semibold text-gray-800 leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0 ${status.color}`}
                    >
                      {status.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Package size={14} className="shrink-0" />
                    <span>{toTitleCase(item.category)}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 mb-4">
                    <strong className="text-gray-700">Available:</strong>{" "}
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleRequest(item)}
                    disabled={item.quantity === 0}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
                      item.quantity === 0
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-[#0b347a] hover:bg-[#0a2a66] text-white shadow-sm"
                    }`}
                  >
                    + Request Item
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 px-4">
            <Package className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No items found.</p>
            <p className="text-sm text-gray-400 mt-1">
              Try a different search or category.
            </p>
          </div>
        )}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Request Item</h2>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-800 font-medium mb-1">{selectedItem.name}</p>
              <p className="text-sm text-gray-500 mb-6">
                {toTitleCase(selectedItem.category)} · {selectedItem.quantity} {selectedItem.unit} available
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
              />

              {quantity > selectedItem.quantity && (
                <p className="text-red-600 text-sm mt-2">
                  Quantity exceeds available stock.
                </p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
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
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#0b347a] hover:bg-[#0a2a66] text-white"
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
