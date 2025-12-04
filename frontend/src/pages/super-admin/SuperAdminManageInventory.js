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
} from "lucide-react";
import { toast } from "react-toastify";


const API_BASE = "http://localhost:5000/api/items";

const StatusBadge = ({ quantity }) => {
  if (quantity === 0)
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-100 text-red-600">
        Out of Stock
      </span>
    );
  if (quantity <= 10)
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-600">
        Limited
      </span>
    );
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-100 text-green-600">
      Available
    </span>
  );
};

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

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once


  // Modals & form state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "Office Supply",
    unit: "pcs",
    quantity: 0,
  });
  const [restockValue, setRestockValue] = useState(0);

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

    // Category filter
    if (categoryFilter && categoryFilter !== "All") {
      res = res.filter((i) => i.category === categoryFilter);
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


  // ---- CRUD handlers ----
  const openAdd = () => {
    setForm({ name: "", category: "Office Supply", unit: "pcs", quantity: 0 });
    setShowAdd(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/${selected._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
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

  
  const handleArchive = async (id) => {
  if (!window.confirm("Archive this item? It will not be visible but can be restored.")) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/archive/${id}`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Archive failed");

    toast.success("Item archived");
    fetchItems();

  } catch (err) {
    console.error("Archive error:", err);
    toast.error(err.message || "Archive failed");
  }
};

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


  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];

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

      {/* Main content (matches dashboard spacing & header) */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          
        {/* LEFT SIDE — PAGE TITLE */}
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-[#0a2a66]">Manage Inventory</h1>
          <p className="text-gray-600">Add, edit, restock and remove items</p>
        </div>

        {/* RIGHT SIDE — SEARCH + FILTER + BUTTON */}
        <div className="flex items-center gap-4">

          {/* SEARCH BAR */}
          <div className="relative w-[280px] mt-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CATEGORY DROPDOWN */}
          <div className="bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="outline-none text-sm pr-6"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition"
          >
            {sortOrder === "asc" ? (
              <>
                <ChevronUp size={18} className="text-gray-600" />
                <span className="text-sm">Sort : Low</span>
              </>
            ) : (
              <>
                <ChevronDown size={18} className="text-gray-600" />
                <span className="text-sm">Sort: High</span>
              </>
            )}
          </button>


          {/* ADD ITEM BUTTON */}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-xl hover:bg-[#082554] transition shadow-sm"
          >
            <PlusCircle size={18} /> Add Item
          </button>
        </div>
      </div>

        {/* The item card layout (grid style) */}
        {loading ? (
          <div>Loading items...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl shadow-md p-5 border"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.category} · {item.unit}
                    </p>
                  </div>

                  <div className="text-right">
                    <StatusBadge quantity={item.quantity ?? 0} />
                    <div className="mt-2 text-sm text-gray-700">
                      <strong className="text-lg">{item.quantity ?? 0}</strong>{" "}
                      <span className="text-xs text-gray-500">{item.unit}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openRestock(item)}
                    className="flex-1 py-2 rounded-lg bg-[#0b347a] hover:bg-[#0a2a66] text-white text-sm flex items-center justify-center gap-2"
                  >
                    <Archive size={14} /> Restock
                  </button>

                  <button
                    onClick={() => openEdit(item)}
                    className="px-3 py-2 rounded-lg border text-sm flex items-center gap-2"
                  >
                    <Edit3 size={14} /> Edit
                  </button>

                  <button
                    onClick={() => handleArchive(item._id)}
                    className="px-3 py-2 rounded-lg border text-sm text-yellow-600 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Archive
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <p className="text-center text-gray-500 mt-10">No items found.</p>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Add Item</h3>
                <button onClick={() => setShowAdd(false)}>
                  <XCircle />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3">

                {/* NAME */}
                <input
                  required
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border p-2 rounded"
                />

                {/* CATEGORY DROPDOWN */}
                <select
                  value={
                    ["Office Supply", "Janitor Supply"].includes(form.category)
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
                  className="w-full border p-2 rounded"
                >
                  <option value="Office Supply">Office Supply</option>
                  <option value="Janitor Supply">Janitor Supply</option>
                  <option value="Other">Other</option>
                </select>

                {/* CUSTOM CATEGORY INPUT */}
                {(!["Office Supply", "Janitor Supply"].includes(form.category)) && (
                  <input
                    required
                    placeholder="Enter custom category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full border p-2 rounded mt-2"
                  />
                )}

                {/* UNIT DROPDOWN */}
                <select
                  value={
                    [
                      "box", "bottle", "can", "gallon", "jar", "pack",
                      "pad", "piece", "pouch", "ream", "roll", "set",
                      "tub", "unit"
                    ].includes(form.unit)
                      ? form.unit
                      : "Other"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "Other") {
                      setForm({ ...form, unit: val });
                    } else {
                      setForm({ ...form, unit: "" }); 
                    }
                  }}
                  className="w-full border p-2 rounded"
                >
                  <option value="box">box</option>
                  <option value="bottle">bottle</option>
                  <option value="can">can</option>
                  <option value="gallon">gallon</option>
                  <option value="jar">jar</option>
                  <option value="pack">pack</option>
                  <option value="pad">pad</option>
                  <option value="piece">piece</option>
                  <option value="pouch">pouch</option>
                  <option value="ream">ream</option>
                  <option value="roll">roll</option>
                  <option value="set">set</option>
                  <option value="tub">tub</option>
                  <option value="unit">unit</option>
                  <option value="Other">Other</option>
                </select>

                {/* CUSTOM UNIT INPUT */}
                {!(
                  [
                    "box", "bottle", "can", "gallon", "jar", "pack", "pad",
                    "piece", "pouch", "ream", "roll", "set", "tub", "unit"
                  ].includes(form.unit)
                ) && (
                  <input
                    required
                    placeholder="Enter custom unit"
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value })
                    }
                    className="w-full border p-2 rounded mt-2"
                  />
                )}

                {/* QUANTITY */}
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="Quantity"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: Number(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                />

                {/* BUTTONS */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-4 py-2 rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#0a2a66] text-white"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEdit && selected && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Edit Item</h3>
                <button onClick={() => setShowEdit(false)}>
                  <XCircle />
                </button>
              </div>

              <form onSubmit={handleEdit} className="space-y-3">

                {/* NAME */}
                <input
                  required
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border p-2 rounded"
                />

                {/* CATEGORY DROPDOWN */}
                <select
                  value={
                    ["Office Supply", "Janitor Supply"].includes(form.category)
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
                  className="w-full border p-2 rounded"
                >
                  <option value="Office Supply">Office Supply</option>
                  <option value="Janitor Supply">Janitor Supply</option>
                  <option value="Other">Other</option>
                </select>

                {/* SHOW CUSTOM CATEGORY INPUT */}
                {(!["Office Supply", "Janitor Supply"].includes(form.category)) && (
                  <input
                    required
                    placeholder="Enter custom category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full border p-2 rounded mt-2"
                  />
                )}

                {/* UNIT DROPDOWN */}
                <select
                  value={
                    [
                      "box", "bottle", "can", "gallon", "jar", "pack",
                      "pad", "piece", "pouch", "ream", "roll", "set",
                      "tub", "unit"
                    ].includes(form.unit)
                      ? form.unit
                      : "Other"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "Other") {
                      setForm({ ...form, unit: val });
                    } else {
                      setForm({ ...form, unit: "" });
                    }
                  }}
                  className="w-full border p-2 rounded"
                >
                  <option value="box">box</option>
                  <option value="bottle">bottle</option>
                  <option value="can">can</option>
                  <option value="gallon">gallon</option>
                  <option value="jar">jar</option>
                  <option value="pack">pack</option>
                  <option value="pad">pad</option>
                  <option value="piece">piece</option>
                  <option value="pouch">pouch</option>
                  <option value="ream">ream</option>
                  <option value="roll">roll</option>
                  <option value="set">set</option>
                  <option value="tub">tub</option>
                  <option value="unit">unit</option>
                  <option value="Other">Other</option>
                </select>

                {/* SHOW CUSTOM UNIT INPUT */}
                {!(
                  [
                    "box", "bottle", "can", "gallon", "jar", "pack", "pad",
                    "piece", "pouch", "ream", "roll", "set", "tub", "unit"
                  ].includes(form.unit)
                ) && (
                  <input
                    required
                    placeholder="Enter custom unit"
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value })
                    }
                    className="w-full border p-2 rounded mt-2"
                  />
                )}

                {/* QUANTITY */}
                {/* <input
                  required
                  type="number"
                  min="0"
                  placeholder="Quantity"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: Number(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                /> */}

                {/* BUTTONS */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    className="px-4 py-2 rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#0a2a66] text-white"
                  >
                    Save
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
      </main>
    </div>
  );
};

export default SuperAdminManageInventory;
