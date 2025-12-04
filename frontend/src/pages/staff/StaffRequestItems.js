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
} from "lucide-react";
import { toast } from "react-toastify";

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
      const res = await fetch("http://localhost:5000/api/items");
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

  //  Search + filter logic
  useEffect(() => {
    let result = items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filterCategory !== "All") {
      result = result.filter((item) => item.category === filterCategory);
    }
    setFilteredItems(result);
  }, [search, filterCategory, items]);

  //  Show modal
  const handleRequest = (item) => {
    setSelectedItem(item);
    setQuantity(1);
  };

  //  Submit request
  // const handleSubmitRequest = async () => {
  //   if (!selectedItem) return;

  //   if (quantity <= 0) {
  //     toast.warning("Please enter a valid quantity.");
  //     return;
  //   }

  //   try {
  //     const res = await fetch("http://localhost:5000/api/requests", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         userId,
  //         itemId: selectedItem._id,
  //         itemName: selectedItem.name,
  //         department,
  //         requestedBy: userName,
  //         quantity,
  //       }),
  //     });

  //     const data = await res.json();

  //     if (res.ok) {
  //       toast.success(`Request for "${selectedItem.name}" successful!`);
  //       setSelectedItem(null);
  //       await fetchItems(); // Refresh inventory
  //     } else {
  //       toast.error(data.message || "Request failed");
  //       setSelectedItem(null);
  //     }
  //   } catch (err) {
  //     console.error("Error submitting request:", err);
  //     toast.error("Server error while submitting request.");
  //   }
  // };

  const handleSubmitRequest = async () => {
    if (!selectedItem || submitLoading) return;

    if (quantity <= 0) {
      toast.warning("Please enter a valid quantity.");
      return;
    }

    setSubmitLoading(true); // ⛔ lock button

    try {
      const res = await fetch("http://localhost:5000/api/requests", {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#002B7F]">Request Items</h1>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-1/3 mt-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {["All", "Office Supply", "Janitor Supply"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg border transition ${
                  filterCategory === cat
                    ? "bg-[#002B7F] text-white border-[#002B7F]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const status = getStatus(item.quantity);
            return (
              <div
                key={item._id}
                className="bg-white p-5 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[15px] font-semibold text-gray-800 leading-snug">
                      {item.name}
                    </h3>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md whitespace-nowrap ${status.color}`}
                      style={{ minWidth: "80px", textAlign: "center" }}
                    >
                      {status.text}
                    </span>
                  </div>

                  <p className="text-[13px] text-gray-600">
                    <strong>Category:</strong> {item.category}
                  </p>
                  <p className="text-[13px] text-gray-600 mb-4">
                    <strong>Available:</strong> {item.quantity} {item.unit}s
                  </p>
                </div>

                <button
                  onClick={() => handleRequest(item)}
                  disabled={item.quantity === 0}
                  className={`w-full py-2.5 rounded-lg text-sm text-white font-medium transition ${
                    item.quantity === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#0b347a] hover:bg-[#0a2a66]"
                  }`}
                >
                  + Request Item
                </button>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <p className="text-center text-gray-500 mt-10 italic">
            No items found.
          </p>
        )}
      </main>

      {/*  Request Quantity Modal */}
      {/* {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <XCircle size={22} />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-center text-[#002B7F]">
              Request Item
            </h2>
            <p className="text-center text-gray-600 mb-6">
              <strong>{selectedItem.name}</strong>
            </p>

            <label className="block text-gray-700 font-medium mb-2">
              Enter quantity:
            </label>
            <input
              type="number"
              min="1"
              max={selectedItem.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                className="px-4 py-2 rounded-lg bg-[#0b347a] hover:bg-[#0a2a66] text-white font-medium"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )} */}

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <XCircle size={22} />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-center text-[#002B7F]">
              Request Item
            </h2>
            <p className="text-center text-gray-600 mb-6">
              <strong>{selectedItem.name}</strong>
            </p>

            <label className="block text-gray-700 font-medium mb-2">
              Enter quantity:
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />

            {/* ⚠ Live validation */}
            {quantity > selectedItem.quantity && (
              <p className="text-red-600 text-sm mt-2 mb-0">
                Quantity exceeds available stock!
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>

              {/* <button
                onClick={handleSubmitRequest}
                disabled={quantity > selectedItem.quantity || quantity <= 0}
                className={`px-4 py-2 rounded-lg font-medium text-white
                  ${quantity > selectedItem.quantity || quantity <= 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#0b347a] hover:bg-[#0a2a66]"
                  }`}
              >
                Submit Request
              </button> */}

              <button
                onClick={handleSubmitRequest}
                disabled={
                  submitLoading ||
                  quantity > selectedItem.quantity ||
                  quantity <= 0
                }
                className={`px-4 py-2 rounded-lg font-medium text-white transition
                  ${submitLoading ||
                  quantity > selectedItem.quantity ||
                  quantity <= 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#0b347a] hover:bg-[#0a2a66]"
                  }`}
              >
                {submitLoading ? "Submitting..." : "Submit Request"}
              </button>

            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};


export default StaffRequestItems;
