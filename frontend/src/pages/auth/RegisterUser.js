import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { EyeOpenIcon, EyeClosedIcon, Cross2Icon } from "@radix-ui/react-icons";
import AuthShell from "../../components/AuthShell";
import { API_URL } from "../../config/api";

const Register = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // Toast: inline message bar (replaces alert)
  const [toast, setToast] = useState({ text: "", type: "" });

  // Inline field errors (shown under inputs)
  const [fieldErrors, setFieldErrors] = useState({
    accessID: "",
    password: "",
  });

  const [linkInvalid, setLinkInvalid] = useState(false);

  const [form, setForm] = useState({
    name: "",
    password: "",
    department: "",
    accessID: "",
  });

  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
  });

  const showToast = (text, type = "error") => {
    setToast({ text, type });
    if (type === "success") {
      setTimeout(() => setToast({ text: "", type: "" }), 4000);
    }
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Decode token on page load
  useEffect(() => {
    const token = params.get("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setEmail(decoded.email);
        setRole(decoded.role);
      } catch (err) {
        setLinkInvalid(true);
        showToast("Invalid or expired invitation link.", "error");
        setTimeout(() => navigate("/"), 3500);
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

  const allRequirementsMet = Object.values(requirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ accessID: "", password: "" });
    setToast({ text: "", type: "" });

    // Inline validation (no alerts)
    const accessIDEmpty = !form.accessID || form.accessID.trim() === "";
    if (accessIDEmpty) {
      setFieldErrors((prev) => ({ ...prev, accessID: "Please enter your Access ID." }));
    }
    if (!allRequirementsMet) {
      setFieldErrors((prev) => ({ ...prev, password: "Password does not meet all requirements above." }));
    }
    if (accessIDEmpty || !allRequirementsMet) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          name: form.name,
          department: form.department,
          password: form.password,
          accessID: form.accessID.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Account created successfully! Redirecting…", "success");
        setTimeout(() => navigate("/"), 2000);
      } else {
        showToast(data.message || "Failed to register. The link may have expired.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Complete your registration using the form below."
      footer={
        <div className="flex items-center justify-center gap-2">
          <span>Need to sign in?</span>
          <Link
            to="/"
            className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Back to login
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="relative space-y-4">
        {/* Toast message (replaces alert) */}
        {toast.text && (
          <div
            role="alert"
            className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-sm ${
              toast.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast({ text: "", type: "" })}
              className="shrink-0 rounded-lg p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Dismiss"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>
        )}

        {linkInvalid && (
          <div
            role="status"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            Redirecting to login…
          </div>
        )}

        {/* Full Name */}
        <div>
          <label
            htmlFor="name"
            className="auth-label"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Enter your full name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="auth-input"
            required
            autoComplete="name"
          />
        </div>

        {/* Department Select */}
        <div>
          <label
            htmlFor="department"
            className="auth-label"
          >
            Department
          </label>
          <select
            id="department"
            name="department"
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="auth-input"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select Department
            </option>
            <option value="Information Technology">Information Technology</option>
            <option value="Automotive Technology">Automotive Technology</option>
            <option value="Electronics Technology">Electronics Technology</option>
            <option value="EMC">EMC</option>
          </select>
        </div>

        {/* Access ID */}
        <div>
          <label
            htmlFor="accessID"
            className="auth-label"
          >
            Access ID
          </label>
          <input
            id="accessID"
            type="text"
            name="accessID"
            placeholder="Enter your Access ID"
            value={form.accessID}
            onChange={(e) => {
              setForm({ ...form, accessID: e.target.value });
              clearFieldError("accessID");
            }}
            className={`auth-input ${fieldErrors.accessID ? "auth-input-error" : ""}`}
            required
            aria-invalid={!!fieldErrors.accessID}
            aria-describedby={fieldErrors.accessID ? "accessID-error" : undefined}
            autoComplete="username"
          />
          {fieldErrors.accessID && (
            <p id="accessID-error" className="mt-1.5 text-sm text-red-700">
              {fieldErrors.accessID}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {role === "staff" && "Access ID should start with STAFF"}
            {role === "departmentadmin" && "Access ID should start with DEPT"}
          </p>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="auth-label"
          >
            Password
          </label>

          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create a secure password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                checkPassword(e.target.value);
                clearFieldError("password");
              }}
              className={`auth-input pr-12 ${fieldErrors.password ? "auth-input-error" : ""}`}
              required
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-icon-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeClosedIcon className="h-5 w-5" />
              ) : (
                <EyeOpenIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Password Requirements Section */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">
            Password must contain:
          </p>

          {[
            { label: "At least 8 characters", key: "length" },
            { label: "One uppercase letter (A–Z)", key: "uppercase" },
            { label: "One number (0–9)", key: "number" },
            { label: "One special symbol (@, $, !, %, etc.)", key: "symbol" },
          ].map((req) => (
            <div key={req.key} className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-300 ${
                  requirements[req.key]
                    ? "border-emerald-600 bg-emerald-500"
                    : "border-rose-300 bg-rose-100"
                }`}
              >
                {requirements[req.key] && (
                  <span className="text-xs font-bold text-white">✔</span>
                )}
              </div>
              <span
                className={`text-sm ${
                  requirements[req.key] ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {req.label}
              </span>
            </div>
          ))}
          {fieldErrors.password && (
            <p id="password-error" className="mt-2 text-sm text-red-700">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg
                className="mr-2 h-5 w-5 animate-spin text-white"
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
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;
