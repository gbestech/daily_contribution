// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components
import Layout from "./components/common/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Admin Components
import AdminDashboard from "./components/admin/Dashboard";
import AdminMembers from "./components/admin/Members";
import AdminTransactions from "./components/admin/Transactions";
import AdminPending from "./components/admin/Pending";
import AdminReports from "./components/admin/Reports";
import AdminSettings from "./components/admin/Settings";
import UserManagement from "./components/admin/UserManagement";
import AdminProfile from "./components/admin/AdminProfile"; // <-- ADD THIS

// Member Components
import MemberDashboard from "./components/member/Dashboard";
import MemberDeposit from "./components/member/Deposit";
import MemberWithdraw from "./components/member/Withdraw";
import MemberTransfer from "./components/member/Transfer";
import MemberHistory from "./components/member/History";
import MemberProfile from "./components/member/MemberProfile"; // <-- ADD THIS

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "administrator";

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ADMIN ROUTES - WRAPPED WITH LAYOUT */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminMembers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminTransactions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pending"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminPending />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminReports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminSettings />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* ADD ADMIN PROFILE ROUTE */}
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminProfile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* MEMBER ROUTES - WRAPPED WITH LAYOUT */}
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
      {/* ADD MEMBER PROFILE ROUTE */}
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

      {/* DEFAULT ROUTE */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            isAdmin ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/member" />
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
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a2e",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
