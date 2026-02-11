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

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Staff */}
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/staff/requests" element={<StaffRequestItems />} />
        <Route path="/staff/history" element={<StaffHistory />} />
        <Route path="/staff/settings" element={<StaffSettings />} />

        {/* Department Admin */}
        <Route path="/department-admin" element={<DepartmentAdminDashboard />} />
        <Route path="/department-admin/users" element={<DepartmentAdminManageUsers />} />
        <Route path="/department-admin/settings" element={<DepartmentAdminSettings />} />
        <Route path="/department-admin/requests" element={<DepartmentAdminRequests />} />
        <Route path="/department-admin/reports" element={<Navigate to="/department-admin/requests" replace />} />
        <Route path="/department-admin/archived-users" element={<DepartmentAdminArchivedUsers />} />

        {/* Super Admin */}
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/manage-users" element={<ManageUsers />} />
        <Route path="/super-admin/requests" element={<SuperAdminRequests />} />
        <Route path="/super-admin/reports" element={<Navigate to="/super-admin/requests" replace />} />
        <Route path="/super-admin/manage-inventory" element={<SuperAdminManageInventory />} />
        <Route path="/super-admin/calendar-alerts" element={<CalendarAlerts />} />
        <Route path="/super-admin/archived-records" element={<SuperAdminArchivedRecords />} />
        <Route path="/super-admin/system-logs" element={<SuperAdminSystemLogs />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
      </Routes>
    </Router>
  );
}

export default App;
