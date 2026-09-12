// src/components/common/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../context/PermissionsContext";

// Map every protected path to the permission required
const ROUTE_PERMISSIONS = {
  // Admin / Manager area
  "/admin": "view_dashboard",
  "/admin/dashboard": "view_dashboard",
  "/admin/broadsheet": "view_broadsheet",
  "/admin/transactions": "view_transactions",
  "/admin/pending": "approve_transactions",
  "/admin/reports": "view_reports",
  "/admin/users": "create_member",
  "/admin/members": "create_member",
  "/admin/expenses": "manage_expenses", // ✅ ADDED — the fix
  "/admin/staff": "manage_staff",
  "/admin/permissions": "manage_permissions",
  "/admin/settings": "manage_settings",
  "/admin/profile": "view_dashboard",

  // Member area
  "/member": "view_dashboard",
  "/member/dashboard": "view_dashboard",
  "/member/deposit": "create_deposit",
  "/member/withdraw": "create_withdrawal",
  "/member/transfer": "create_transfer",
  "/member/history": "view_history",
  "/member/borrowing": "view_dashboard",
  "/member/profile": "view_dashboard",
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAuthenticated } = useAuth();
  const { can, loading } = usePermission();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "white",
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

  // 2. Permission-based check FIRST (works for admin, manager, member)
  const requiredPerm = ROUTE_PERMISSIONS[location.pathname];
  if (requiredPerm && !can(requiredPerm)) {
    const role = String(user?.role || "")
      .trim()
      .toLowerCase();
    const home =
      role === "admin" || role === "administrator" || role === "manager"
        ? "/admin/dashboard"
        : "/member/dashboard";
    return <Navigate to={home} replace />;
  }

  // 3. Legacy adminOnly support — as a *fallback* only.
  //    If the route is explicitly admin-only AND not covered by
  //    ROUTE_PERMISSIONS, enforce admin role here.
  if (
    adminOnly &&
    !requiredPerm &&
    user?.role !== "admin" &&
    user?.role !== "administrator"
  ) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
