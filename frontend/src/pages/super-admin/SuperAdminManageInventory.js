import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  PlusCircle,
  Edit3,
  Archive,
  Search,
  XCircle,
  Home,
  ClipboardList,
  Package,
  UserCog,
  ChevronUp,
  ChevronDown,
  LogOut,
  Calendar,
  FileText,
  Trash2,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";


import { API_URL } from "../../config/api";
const API_BASE = `${API_URL}/items`;

const StatusBadge = ({ quantity }) => {
  if (quantity === 0)
    return (
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-100 text-red-600 shrink-0">
        Out of Stock
      </span>
    );
  if (quantity <= 10)
    return (
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-600 shrink-0">
        Limited
      </span>
    );
  return (
    <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-green-100 text-green-600 shrink-0">
      Available
    </span>
  );
};

/** Title-case a string (e.g. "HOME SUPPLY" -> "Home Supply") */
const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return str;
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Get unique categories from items, case-insensitive.
 * Returns one canonical string per logical category (first occurrence wins).
 */
const getCanonicalCategories = (itemsList) => {
  const seen = new Map(); // lowercase -> canonical string
  for (const item of itemsList) {
    const cat = item.category;
    if (!cat) continue;
    const key = cat.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, cat.trim());
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

/**
 * Resolve custom category: if it matches an existing category (case-insensitive),
 * return that existing canonical string; otherwise return title-cased new category.
 */
const resolveCategory = (inputCategory, itemsList) => {
  const trimmed = (inputCategory || "").trim();
  if (!trimmed) return trimmed;
  const canonical = getCanonicalCategories(itemsList);
  const key = trimmed.toLowerCase();
  const found = canonical.find((c) => c.toLowerCase() === key);
  return found !== undefined ? found : toTitleCase(trimmed);
};

const STANDARD_CATEGORIES = ["Office Supply", "Janitor Supply"];
const STANDARD_UNITS = [
  "box", "bottle", "can", "gallon", "jar", "pack", "pad",
  "piece", "pouch", "ream", "roll", "set", "tub", "unit",
];

const SuperAdminManageInventory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("Super Admin");
  const [showLogout, setShowLogout] = useState(false);

  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  // sorting ascending and descending
  const [sortOrder, setSortOrder] = useState("asc"); // asc | desc

  // pagination (fixed 25 per page for consistency)
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once


  // Modals & form state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    quantity: "",
  });
  const [restockValue, setRestockValue] = useState(0);

  // Archive confirmation (replaces window.confirm)
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Add modal: track "Other" for category/unit so dropdown stays on "Other" while custom input is empty
  const [addCategoryOther, setAddCategoryOther] = useState(false);
  const [addUnitOther, setAddUnitOther] = useState(false);

  // Sidebar helper (same as dashboard)
  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  // Fetch items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
      setFiltered(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Fetch items error:", err);
      toast.error("Unable to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter & search
  useEffect(() => {
    let res = [...items];

    // Search filter
    if (search) {
      res = res.filter((i) =>
        i.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filter (case-insensitive so "Home Supply" matches "HOME SUPPLY" etc.)
    if (categoryFilter && categoryFilter !== "All") {
      const filterKey = categoryFilter.trim().toLowerCase();
      res = res.filter((i) => (i.category || "").trim().toLowerCase() === filterKey);
    }

    // 🔥 Sorting logic
    res.sort((a, b) => {
      const qtyA = a.quantity ?? 0;
      const qtyB = b.quantity ?? 0;

      return sortOrder === "asc"
        ? qtyA - qtyB // ascending
        : qtyB - qtyA; // descending
    });

    setFiltered(res);
  }, [search, categoryFilter, sortOrder, items]);

  // Reset pagination when filters/sort change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, sortOrder]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const showingFrom = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(total, safePage * PAGE_SIZE);

  const pagedFiltered = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    (safePage - 1) * PAGE_SIZE + PAGE_SIZE
  );


  // ---- CRUD handlers ----
  const openAdd = () => {
    setForm({ name: "", category: "", unit: "", quantity: "" });
    setAddCategoryOther(false);
    setAddUnitOther(false);
    setShowAdd(true);
  };

  // Category options for Add/Edit: standard + existing custom categories (from inventory) + Other
  const addEditCategoryOptions = [
    ...STANDARD_CATEGORIES,
    ...getCanonicalCategories(items).filter(
      (c) =>
        c.trim().toLowerCase() !== "office supply" &&
        c.trim().toLowerCase() !== "janitor supply"
    ),
    "Other",
  ];

  const handleAdd = async (e) => {
    e.preventDefault();
    const catTrim = (form.category || "").trim();
    const unitTrim = (form.unit || "").trim();
    if (!catTrim) {
      toast.error("Please select or enter a category.");
      return;
    }
    if (!unitTrim) {
      toast.error("Please select or enter a unit.");
      return;
    }
    const qtyNum = form.quantity === "" ? NaN : Number(form.quantity);
    if (Number.isNaN(qtyNum) || qtyNum < 0) {
      toast.error("Please enter a valid quantity (0 or greater).");
      return;
    }
    try {
      // Normalize custom category: match existing (case-insensitive) or title-case new
      const payload = {
        name: form.name.trim(),
        category: STANDARD_CATEGORIES.includes(form.category)
          ? form.category
          : resolveCategory(form.category, items),
        unit: STANDARD_UNITS.includes(form.unit) ? form.unit : unitTrim,
        quantity: qtyNum,
      };
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add");
      toast.success("Item added");
      setShowAdd(false);
      fetchItems();
    } catch (err) {
      console.error("Add item error:", err);
      toast.error(err.message || "Add failed");
    }
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      // Normalize custom category: match existing (case-insensitive) or title-case new
      const payload = { ...form };
      if (!["Office Supply", "Janitor Supply"].includes(form.category)) {
        payload.category = resolveCategory(form.category, items);
      }
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/${selected._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");
      toast.success("Item updated");
      setShowEdit(false);
      setSelected(null);
      fetchItems();
    } catch (err) {
      console.error("Edit item error:", err);
      toast.error(err.message || "Update failed");
    }
  };

  const openRestock = (item) => {
    setSelected(item);
    setRestockValue(0);
    setShowRestock(true);
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const token = localStorage.getItem("token");
      // attempt PATCH/endpoint, fallback to PUT
      const patchRes = await fetch(`${API_BASE}/restock/${selected._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ addQuantity: Number(restockValue) }),
      });
      const data = await patchRes.json();
      if (!patchRes.ok) throw new Error(data.message || "Failed to restock");
      toast.success("Restocked");
      setShowRestock(false);
      setSelected(null);
      fetchItems();
    } catch (err) {
      console.error("Restock error:", err);
      toast.error(err.message || "Restock failed");
    }
  };

  /** Open archive confirmation (replaces window.confirm) */
  const openArchiveConfirm = (item) => {
    setArchiveConfirm({ id: item._id, name: item.name });
  };

  /** Perform archive after user confirms */
  const handleArchiveConfirm = async () => {
    if (!archiveConfirm) return;
    const { id } = archiveConfirm;
    setArchiving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/archive/${id}`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Archive failed");
      toast.success("Item archived. It can be restored from Archived Records.");
      setArchiveConfirm(null);
      fetchItems();
    } catch (err) {
      console.error("Archive error:", err);
      toast.error(err.message || "Archive failed");
    } finally {
      setArchiving(false);
    }
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


  const categories = ["All", ...getCanonicalCategories(items)];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar (same as dashboard) */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Super Admin Portal</p>

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

        {/* Bottom user section */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">College of Technology</p>
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

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66]">Manage Inventory</h1>
            <p className="text-gray-600 mt-1">Add, edit, restock and remove items</p>
          </div>

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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
              />
            </div>
            <div className="bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm min-w-[140px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="outline-none text-sm text-gray-900 pr-6 w-full bg-transparent focus:ring-0"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All categories" : toTitleCase(cat)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-1.5 bg-white border border-gray-300 px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition text-sm text-gray-700"
            >
              {sortOrder === "asc" ? (
                <ChevronUp size={16} className="text-gray-600" />
              ) : (
                <ChevronDown size={16} className="text-gray-600" />
              )}
              <span>{sortOrder === "asc" ? "Low" : "High"}</span>
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2.5 rounded-xl hover:bg-[#082554] transition shadow-sm text-sm font-medium"
            >
              <PlusCircle size={18} /> Add Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="animate-spin text-[#0a2a66]" size={32} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-800">{showingFrom}</span>–<span className="font-semibold text-gray-800">{showingTo}</span> of{" "}
                <span className="font-semibold text-gray-800">{total}</span>
              </p>
              <p className="text-sm text-gray-500">
                Page <span className="font-semibold text-gray-800">{safePage}</span> of{" "}
                <span className="font-semibold text-gray-800">{totalPages}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedFiltered.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition flex flex-col"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-[15px] font-semibold text-gray-800 leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <StatusBadge quantity={item.quantity ?? 0} />
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Package size={14} className="shrink-0" />
                    <span>{toTitleCase(item.category)}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 mb-4">
                    <strong className="text-gray-700">Available:</strong>{" "}
                    {item.quantity ?? 0} {item.unit}
                  </p>
                </div>
                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => openRestock(item)}
                    className="flex-1 py-2 rounded-xl bg-[#0b347a] hover:bg-[#0a2a66] text-white text-sm font-medium transition shadow-sm"
                  >
                    Restock
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition shrink-0"
                    title="Edit item"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => openArchiveConfirm(item)}
                    className="px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 text-sm font-medium transition shrink-0"
                    title="Archive item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 px-4">
            <Package className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No items found.</p>
            <p className="text-sm text-gray-400 mt-1">
              Try a different search or category.
            </p>
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-6 pt-6 pb-2 flex justify-between items-center border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Add Item</h3>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Close"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-6 space-y-5">
                {/* NAME */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Item name
                  </label>
                  <input
                    required
                    placeholder="Enter item name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={
                      addCategoryOther || (form.category !== "" && !addEditCategoryOptions.includes(form.category))
                        ? "Other"
                        : form.category === ""
                          ? ""
                          : form.category
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "Other") {
                        setAddCategoryOther(false);
                        setForm({ ...form, category: val });
                      } else {
                        setAddCategoryOther(true);
                        setForm({ ...form, category: "" });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition bg-white"
                  >
                    <option value="">Select category...</option>
                    {addEditCategoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === "Other" ? "Other (enter new)" : toTitleCase(opt)}
                      </option>
                    ))}
                  </select>
                  {(addCategoryOther || (form.category !== "" && !addEditCategoryOptions.includes(form.category))) && (
                    <input
                      placeholder="Enter custom category (e.g. Home Supply)"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mt-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                    />
                  )}
                </div>

                {/* UNIT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unit
                  </label>
                  <select
                    value={
                      addUnitOther || (form.unit !== "" && !STANDARD_UNITS.includes(form.unit))
                        ? "Other"
                        : form.unit === ""
                          ? ""
                          : form.unit
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "Other") {
                        setAddUnitOther(false);
                        setForm({ ...form, unit: val });
                      } else {
                        setAddUnitOther(true);
                        setForm({ ...form, unit: "" });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition bg-white"
                  >
                    <option value="">Select unit...</option>
                    {STANDARD_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="Other">Other (enter new)</option>
                  </select>
                  {(addUnitOther || (form.unit !== "" && !STANDARD_UNITS.includes(form.unit))) && (
                    <input
                      placeholder="Enter custom unit"
                      value={form.unit}
                      onChange={(e) =>
                        setForm({ ...form, unit: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mt-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                    />
                  )}
                </div>

                {/* QUANTITY */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Initial quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter quantity (0 or more)"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                  />
                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#0a2a66] text-white hover:bg-[#082554] transition font-medium shadow-sm"
                  >
                    Add item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEdit && selected && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-6 pt-6 pb-2 flex justify-between items-center border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Edit Item</h3>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Close"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleEdit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Item name</label>
                  <input
                    required
                    placeholder="Enter item name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    value={
                      addEditCategoryOptions.includes(form.category)
                        ? form.category
                        : "Other"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "Other") {
                        setForm({ ...form, category: val });
                      } else {
                        setForm({ ...form, category: "" });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition bg-white"
                  >
                    {addEditCategoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === "Other" ? "Other (enter new)" : toTitleCase(opt)}
                      </option>
                    ))}
                  </select>
                  {!addEditCategoryOptions.includes(form.category) && (
                    <input
                      required
                      placeholder="Enter custom category (e.g. Home Supply)"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mt-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                  <select
                    value={
                      STANDARD_UNITS.includes(form.unit) ? form.unit : "Other"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "Other") {
                        setForm({ ...form, unit: val });
                      } else {
                        setForm({ ...form, unit: "" });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition bg-white"
                  >
                    {STANDARD_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="Other">Other (enter new)</option>
                  </select>
                  {!STANDARD_UNITS.includes(form.unit) && (
                    <input
                      required
                      placeholder="Enter custom unit"
                      value={form.unit}
                      onChange={(e) =>
                        setForm({ ...form, unit: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 mt-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a2a66]/20 focus:border-[#0a2a66] transition"
                    />
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#0a2a66] text-white hover:bg-[#082554] transition font-medium shadow-sm"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Restock Modal */}
        {showRestock && selected && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Restock {selected.name}</h3>
                <button onClick={() => setShowRestock(false)}>
                  <XCircle />
                </button>
              </div>
              <form onSubmit={handleRestock} className="space-y-3">
                <label className="block text-sm">Add quantity</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={restockValue}
                  onChange={(e) => setRestockValue(e.target.value)}
                  className="w-full border p-2 rounded"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowRestock(false)} className="px-4 py-2 rounded border">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded bg-[#0b347a] hover:bg-[#0a2a66] text-white">
                    Restock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Archive confirmation (replaces window.confirm) */}
        {archiveConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !archiving && setArchiveConfirm(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-item-dialog-title"
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Archive size={24} />
                </div>
                <h2 id="archive-item-dialog-title" className="text-xl font-semibold text-gray-800">
                  Archive item?
                </h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to archive <strong>{archiveConfirm.name}</strong>? It will not be visible here but can be restored from Archived Records.
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
                  onClick={handleArchiveConfirm}
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
      </main>
    </div>
  );
};

export default SuperAdminManageInventory;
