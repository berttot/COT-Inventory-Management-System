import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

const Register = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    password: "",
    department: "",
  });

  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
  });

  // Decode token on page load
  useEffect(() => {
    const token = params.get("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setEmail(decoded.email);
        setRole(decoded.role);
      } catch (err) {
        alert("Invalid or expired invitation link.");
        navigate("/");
      }
    }
  }, [navigate, params]);

  // 🔥 Password Requirements Checker
  const checkPassword = (password) => {
    setRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[@$!%*?&#^()_\-+=]/.test(password),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let prefix = "USR";
      if (role === "departmentadmin") prefix = "DEP";
      else if (role === "staff") prefix = "STAFF";

      const accessID = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          name: form.name,
          department: form.department,
          password: form.password,
          accessID,
        }),
      });

      if (response.ok) {
        alert(`Account created successfully!\nYour Access ID: ${accessID}`);
        navigate("/");
      } else {
        alert("Failed to register. The link may have expired.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-100 via-white to-blue-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <h2 className="text-3xl font-bold mb-2 text-center text-[#0a2a66]">
          Create Your Account
        </h2>
        <p className="text-sm text-gray-500 text-center mb-8">
          Complete your registration using the form below.
        </p>

        {/* Full Name */}
        <div className="mb-1">
          <label className="block text-gray-700 font-medium mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter your full name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
          />
        </div>

        {/* Department Select */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Department</label>
          <select
            name="department"
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
          >
            <option value="">Select Department</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Automotive Technology">Automotive Technology</option>
            <option value="Electronics Technology">Electronics Technology</option>
            <option value="EMC">EMC</option>
          </select>
        </div>

        {/* Password */}
        <div className="mb-3">
          <label className="block text-gray-700 font-medium mb-1">Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create a secure password"
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                checkPassword(e.target.value);
              }}
              className="w-full border border-gray-300 p-3 rounded-lg pr-12 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <EyeClosedIcon className="w-5 h-5" />
              ) : (
                <EyeOpenIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Password Requirements Section */}
        <div className="space-y-1 mb-5">
          <p className="text-sm text-gray-600 font-medium">Password must contain:</p>

          {[
            { label: "At least 8 characters", key: "length" },
            { label: "One uppercase letter (A–Z)", key: "uppercase" },
            { label: "One number (0–9)", key: "number" },
            { label: "One special symbol (@, $, !, %, etc.)", key: "symbol" },
          ].map((req) => (
            <div key={req.key} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  requirements[req.key]
                    ? "bg-green-500 border-green-600"
                    : "bg-red-200 border-red-400"
                }`}
              >
                {requirements[req.key] && (
                  <span className="text-white text-xs font-bold">✔</span>
                )}
              </div>
              <span
                className={`text-sm ${
                  requirements[req.key] ? "text-green-600" : "text-red-600"
                }`}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-[#0a2a66] hover:bg-blue-800 shadow-lg"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                ></path>
              </svg>
              Creating account…
            </div>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );
};

export default Register;
