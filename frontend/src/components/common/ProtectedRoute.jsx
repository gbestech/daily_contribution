// src/components/common/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../context/PermissionsContext";

// Permission requirements are ONLY for admin/manager routes.
// Members do not need a permission set — they just need to be logged in.
const ROUTE_PERMISSIONS = {
  "/admin": "view_dashboard",
  "/admin/dashboard": "view_dashboard",
  "/admin/broadsheet": "view_broadsheet",
  "/admin/transactions": "view_transactions",
  "/admin/pending": "approve_transactions",
  "/admin/reports": "view_reports",
  "/admin/users": "create_member",
  "/admin/members": "create_member",
  "/admin/expenses": "manage_expenses",
  "/admin/staff": "manage_staff",
  "/admin/permissions": "manage_permissions",
  "/admin/settings": "manage_settings",
  "/admin/profile": "view_dashboard",
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAuthenticated } = useAuth();
  const { can, loading } = usePermission();
  const location = useLocation();

  // Wait for permissions context to finish loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "var(--text)",
        }}
      >
        Loading...
      </div>
    );
  }

  // 1. Not logged in at all → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdminOrManager =
    role === "admin" || role === "administrator" || role === "manager";

  // 2. Permission check — only applies to admin/manager routes
  const requiredPerm = ROUTE_PERMISSIONS[location.pathname];
  if (isAdminOrManager && requiredPerm && !can(requiredPerm)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // 3. Legacy adminOnly support
  if (adminOnly && !requiredPerm && !isAdminOrManager) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
