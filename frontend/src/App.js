import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import DepartmentAdminDashboard from "./pages/department-admin/DepartmentAdminDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import ManageUsers from "./pages/super-admin/ManageUsers";
import Register from "./pages/auth/RegisterUser";
import ResetPassword from "./pages/auth/ResetPassword";
import DepartmentAdminManageUsers from "./pages/department-admin/DepartmentAdminManageUsers";
import DepartmentAdminSettings from "./pages/department-admin/DepartmentAdminSettings";
import StaffRequestItems from "./pages/staff/StaffRequestItems";
import StaffHistory from "./pages/staff/StaffHistory";
import DepartmentAdminRequests from "./pages/department-admin/DepartmentAdminRequests";
import StaffSettings from "./pages/staff/StaffSettings";
import SuperAdminRequests from "./pages/super-admin/SuperAdminRequests";
import DepartmentAdminReports from "./pages/department-admin/reports";
import SuperAdminReports from "./pages/super-admin/superAdminReports";
import ForgotPassword from "./pages/auth/ForgotPassword";
import SuperAdminManageInventory from "./pages/super-admin/SuperAdminManageInventory";
import CalendarAlerts from "./pages/super-admin/CalendarAlerts";
import SuperAdminArchivedRecords from "./pages/super-admin/SuperAdminArchivedRecords";
import DepartmentAdminArchivedUsers from "./pages/department-admin/DepartmentAdminArchivedUsers";
import SuperAdminSystemLogs from "./pages/super-admin/SuperAdminSystemLogs";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/department-admin" element={<DepartmentAdminDashboard />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/super-admin/manage-users" element={<ManageUsers />} />
        <Route path="/register" element={<Register />} /> 
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/department-admin/users" element={<DepartmentAdminManageUsers />} />
        <Route path="/department-admin/settings" element={<DepartmentAdminSettings />} />
        <Route path="/staff/requests" element={<StaffRequestItems />} />
        <Route path="/staff/history" element={<StaffHistory />} />
        <Route path="/department-admin/requests" element={<DepartmentAdminRequests />} />
        <Route path="/staff/settings" element={<StaffSettings/>}/>
        <Route path="/super-admin/requests" element={<SuperAdminRequests/>}/>
        <Route path="/department-admin/reports" element={<DepartmentAdminReports />} />
        <Route path="/super-admin/reports" element={<SuperAdminReports />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/super-admin/manage-inventory" element={<SuperAdminManageInventory />} />
        <Route path="/super-admin/calendar-alerts" element={<CalendarAlerts />} />
        <Route path="/super-admin/archived-records" element={<SuperAdminArchivedRecords />} />
        <Route path="/department-admin/archived-users" element={<DepartmentAdminArchivedUsers />} />
        <Route path="/super-admin/system-logs" element={<SuperAdminSystemLogs />} />
      </Routes>
    </Router>
  );
}

export default App;
