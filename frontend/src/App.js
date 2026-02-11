import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import Register from "./pages/auth/RegisterUser";
import ResetPassword from "./pages/auth/ResetPassword";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Staff pages
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffRequestItems from "./pages/staff/StaffRequestItems";
import StaffHistory from "./pages/staff/StaffHistory";
import StaffSettings from "./pages/staff/StaffSettings";

// Department Admin pages
import DepartmentAdminDashboard from "./pages/department-admin/DepartmentAdminDashboard";
import DepartmentAdminManageUsers from "./pages/department-admin/DepartmentAdminManageUsers";
import DepartmentAdminSettings from "./pages/department-admin/DepartmentAdminSettings";
import DepartmentAdminRequests from "./pages/department-admin/DepartmentAdminRequests";
import DepartmentAdminArchivedUsers from "./pages/department-admin/DepartmentAdminArchivedUsers";

// Super Admin pages
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import ManageUsers from "./pages/super-admin/ManageUsers";
import SuperAdminRequests from "./pages/super-admin/SuperAdminRequests";
import SuperAdminManageInventory from "./pages/super-admin/SuperAdminManageInventory";
import CalendarAlerts from "./pages/super-admin/CalendarAlerts";
import SuperAdminArchivedRecords from "./pages/super-admin/SuperAdminArchivedRecords";
import SuperAdminSystemLogs from "./pages/super-admin/SuperAdminSystemLogs";
import SuperAdminSettings from "./pages/super-admin/SuperAdminSettings";

// Decide what to show at "/" based on auth state
function AuthLanding() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  if (token && role) {
    if (role === "superadmin") return <Navigate to="/super-admin" replace />;
    if (role === "departmentadmin") return <Navigate to="/department-admin" replace />;
    if (role === "staff") return <Navigate to="/staff" replace />;
  }

  // Not logged in → show login
  return <LoginPage />;
}

// Simple client-side guard based on login + role from localStorage
function ProtectedRoute({ element, allowedRoles }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  // Not logged in → always go back to login
  if (!token || !role) {
    return <Navigate to="/" replace />;
  }

  // Logged in but wrong role for this area → bounce to their dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "superadmin") return <Navigate to="/super-admin" replace />;
    if (role === "departmentadmin") return <Navigate to="/department-admin" replace />;
    if (role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/" replace />;
  }

  return element;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<AuthLanding />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Staff (only for 'staff' role) */}
        <Route
          path="/staff"
          element={<ProtectedRoute element={<StaffDashboard />} allowedRoles={["staff"]} />}
        />
        <Route
          path="/staff/requests"
          element={<ProtectedRoute element={<StaffRequestItems />} allowedRoles={["staff"]} />}
        />
        <Route
          path="/staff/history"
          element={<ProtectedRoute element={<StaffHistory />} allowedRoles={["staff"]} />}
        />
        <Route
          path="/staff/settings"
          element={<ProtectedRoute element={<StaffSettings />} allowedRoles={["staff"]} />}
        />

        {/* Department Admin (only for 'departmentadmin' role) */}
        <Route
          path="/department-admin"
          element={
            <ProtectedRoute
              element={<DepartmentAdminDashboard />}
              allowedRoles={["departmentadmin"]}
            />
          }
        />
        <Route
          path="/department-admin/users"
          element={
            <ProtectedRoute
              element={<DepartmentAdminManageUsers />}
              allowedRoles={["departmentadmin"]}
            />
          }
        />
        <Route
          path="/department-admin/settings"
          element={
            <ProtectedRoute
              element={<DepartmentAdminSettings />}
              allowedRoles={["departmentadmin"]}
            />
          }
        />
        <Route
          path="/department-admin/requests"
          element={
            <ProtectedRoute
              element={<DepartmentAdminRequests />}
              allowedRoles={["departmentadmin"]}
            />
          }
        />
        <Route
          path="/department-admin/reports"
          element={
            <ProtectedRoute
              element={<Navigate to="/department-admin/requests" replace />}
              allowedRoles={["departmentadmin"]}
            />
          }
        />
        <Route
          path="/department-admin/archived-users"
          element={
            <ProtectedRoute
              element={<DepartmentAdminArchivedUsers />}
              allowedRoles={["departmentadmin"]}
            />
          }
        />

        {/* Super Admin (only for 'superadmin' role) */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute
              element={<SuperAdminDashboard />}
              allowedRoles={["superadmin"]}
            />
          }
        />
        <Route
          path="/super-admin/manage-users"
          element={
            <ProtectedRoute element={<ManageUsers />} allowedRoles={["superadmin"]} />
          }
        />
        <Route
          path="/super-admin/requests"
          element={
            <ProtectedRoute
              element={<SuperAdminRequests />}
              allowedRoles={["superadmin"]}
            />
          }
        />
        <Route
          path="/super-admin/reports"
          element={
            <ProtectedRoute
              element={<Navigate to="/super-admin/requests" replace />}
              allowedRoles={["superadmin"]}
            />
          }
        />
        <Route
          path="/super-admin/manage-inventory"
          element={
            <ProtectedRoute
              element={<SuperAdminManageInventory />}
              allowedRoles={["superadmin"]}
            />
          }
        />
        <Route
          path="/super-admin/calendar-alerts"
          element={
            <ProtectedRoute element={<CalendarAlerts />} allowedRoles={["superadmin"]} />
          }
        />
        <Route
          path="/super-admin/archived-records"
          element={
            <ProtectedRoute
              element={<SuperAdminArchivedRecords />}
              allowedRoles={["superadmin"]}
            />
          }
        />
        <Route
          path="/super-admin/system-logs"
          element={
            <ProtectedRoute
              element={<SuperAdminSystemLogs />}
              allowedRoles={["superadmin"]}
            />
          }
        />
        <Route
          path="/super-admin/settings"
          element={
            <ProtectedRoute
              element={<SuperAdminSettings />}
              allowedRoles={["superadmin"]}
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
