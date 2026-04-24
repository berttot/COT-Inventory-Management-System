import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { EyeOpenIcon, EyeClosedIcon, Cross2Icon } from "@radix-ui/react-icons";
import AuthShell from "../../components/AuthShell";
import { API_URL } from "../../config/api";
import {
  getPasswordRequirements,
  PASSWORD_REQUIREMENTS,
} from "../../utils/passwordPolicy";
import {
  isValidFullName,
  sanitizeFullNameInput,
  NAME_POLICY_MESSAGE,
} from "../../utils/namePolicy";

const Register = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [departmentLocked, setDepartmentLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // Toast: inline message bar (replaces alert)
  const [toast, setToast] = useState({ text: "", type: "" });

  // Inline field errors (shown under inputs)
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
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
    ...getPasswordRequirements(""),
  });

  const requirementScore = Object.values(requirements).filter(Boolean).length;
  const strengthLabel =
    requirementScore <= 1
      ? "Weak"
      : requirementScore <= 2
      ? "Fair"
      : requirementScore === 3
      ? "Good"
      : "Strong";
  const strengthTone =
    requirementScore <= 1
      ? "text-rose-700"
      : requirementScore <= 2
      ? "text-amber-700"
      : requirementScore === 3
      ? "text-blue-700"
      : "text-emerald-700";

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
    if (!token) {
      setLinkInvalid(true);
      showToast("Missing invitation link token.", "error");
      setTimeout(() => navigate("/"), 3500);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const isExpired = decoded?.exp && Date.now() >= decoded.exp * 1000;

      if (isExpired) {
        setLinkInvalid(true);
        showToast("Invitation link expired. Please request a new invite.", "error");
        setTimeout(() => navigate("/"), 3500);
        return;
      }

      setInviteToken(token);
      setEmail(decoded.email || "");
      setRole(decoded.role || "");
      if (decoded.department) {
        setForm((prev) => ({ ...prev, department: decoded.department }));
        setDepartmentLocked(true);
      }
    } catch (err) {
      setLinkInvalid(true);
      showToast("Invalid or expired invitation link.", "error");
      setTimeout(() => navigate("/"), 3500);
    }
  }, [navigate, params]);

  // 🔥 Password Requirements Checker
  const checkPassword = (password) => {
    setRequirements(getPasswordRequirements(password));
  };

  const allRequirementsMet = Object.values(requirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ name: "", accessID: "", password: "" });
    setToast({ text: "", type: "" });

    const nameValue = form.name.trim();
    if (!isValidFullName(nameValue)) {
      setFieldErrors((prev) => ({ ...prev, name: NAME_POLICY_MESSAGE }));
    }

    // Inline validation (no alerts)
    if (linkInvalid || !inviteToken) {
      showToast("Invalid or expired invitation link.", "error");
      return;
    }

    const accessIDEmpty = !form.accessID || form.accessID.trim() === "";
    if (accessIDEmpty) {
      setFieldErrors((prev) => ({ ...prev, accessID: "Please enter your Access ID." }));
    }
    if (!allRequirementsMet) {
      setFieldErrors((prev) => ({ ...prev, password: "Password does not meet all requirements above." }));
    }
    if (!isValidFullName(nameValue) || accessIDEmpty || !allRequirementsMet) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken,
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
            value={form.name}
            onChange={(e) => {
              const value = sanitizeFullNameInput(e.target.value);
              setForm({ ...form, name: value });
              if (value.trim()) {
                clearFieldError("name");
              }
            }}
            className={`auth-input ${fieldErrors.name ? "auth-input-error" : ""}`}
            required
            autoComplete="name"
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="name-error" className="mt-1.5 text-sm text-red-700">
              {fieldErrors.name}
            </p>
          )}
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
            value={form.department}
            disabled={departmentLocked}
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
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Password requirements</p>
            <span className={`text-xs font-semibold ${strengthTone}`}>
              {strengthLabel}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  requirementScore >= step
                    ? requirementScore <= 1
                      ? "bg-rose-500"
                      : requirementScore <= 2
                      ? "bg-amber-500"
                      : requirementScore === 3
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {PASSWORD_REQUIREMENTS.map((req) => (
              <div
                key={req.key}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                  requirements[req.key] ? "bg-emerald-50" : "bg-slate-50"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-300 ${
                    requirements[req.key]
                      ? "border-emerald-600 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {requirements[req.key] ? "OK" : "-"}
                </div>
                <span
                  className={`text-sm ${
                    requirements[req.key] ? "text-emerald-700" : "text-slate-600"
                  }`}
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>
          {fieldErrors.password && (
            <p id="password-error" className="mt-2 text-sm text-red-700">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || linkInvalid}
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
