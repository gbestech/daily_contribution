// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PermissionsProvider } from "./context/PermissionsContext";

import Layout from "./components/common/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Admin
import AdminDashboard from "./components/admin/Dashboard";
import AdminMembers from "./components/admin/Members";
import AdminTransactions from "./components/admin/Transactions";
import AdminPending from "./components/admin/Pending";
import AdminReports from "./components/admin/Reports";
import AdminSettings from "./components/admin/Settings";
import UserManagement from "./components/admin/UserManagement";
import AdminProfile from "./components/admin/AdminProfile";
import Broadsheet from "./components/Broadsheet";
import PublicRegister from "./components/admin/PublicRegister";
import Staff from "./components/admin/Staff";
import Permissions from "./components/admin/Permissions";
import Expenses from "./components/admin/Expenses";

// Member
import MemberDashboard from "./components/member/Dashboard";
import MemberDeposit from "./components/member/Deposit";
import MemberWithdraw from "./components/member/Withdraw";
import MemberTransfer from "./components/member/Transfer";
import MemberHistory from "./components/member/History";
import Borrowing from "./components/member/Borrowing";
import MemberProfile from "./components/member/MemberProfile";

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "administrator";

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register-member" element={<PublicRegister />} />

      {/* ============ ADMIN / MANAGER ROUTES ============ */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminMembers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminTransactions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pending"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminPending />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminReports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/broadsheet"
        element={
          <ProtectedRoute>
            <Layout>
              <Broadsheet />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/expenses"
        element={
          <ProtectedRoute>
            <Layout>
              <Expenses />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute>
            <Layout>
              <Staff />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/permissions"
        element={
          <ProtectedRoute>
            <Layout>
              <Permissions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminSettings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ============ MEMBER ROUTES ============ */}
      <Route
        path="/member"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/deposit"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberDeposit />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/withdraw"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberWithdraw />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/transfer"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberTransfer />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/history"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/borrowing"
        element={
          <ProtectedRoute>
            <Layout>
              <Borrowing />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/*"
        element={
          <ProtectedRoute>
            <Layout>
              <MemberDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* DEFAULT + 404 */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            isAdmin ? (
              <Navigate to="/admin/dashboard" />
            ) : (
              <Navigate to="/member/dashboard" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="*"
        element={
          isAuthenticated ? (
            isAdmin ? (
              <Navigate to="/admin/dashboard" />
            ) : (
              <Navigate to="/member/dashboard" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-surface, #1a1a2e)",
              color: "var(--text, #fff)",
              border: "1px solid var(--border, rgba(255,255,255,0.1))",
            },
            success: { icon: "✅", duration: 3000 },
            error: { icon: "❌", duration: 4000 },
          }}
        />
        <AppRoutes />
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;
