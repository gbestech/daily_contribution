// src/components/member/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

// ------------------------------------------------------------
// Extract a rejection reason from any plausible field name
// ------------------------------------------------------------
const getRejectionReason = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.rejection_reason ||
    t.reject_reason ||
    t.rejectionReason ||
    t.rejectReason ||
    t.reason ||
    t.admin_note ||
    t.admin_remarks ||
    t.adminNote ||
    t.adminRemarks ||
    t.note ||
    t.remarks ||
    t.comment ||
    null
  );
};

const getRejectedBy = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.rejected_by ||
    t.rejectedBy ||
    t.approved_by ||
    t.approvedBy ||
    t.admin_name ||
    t.adminName ||
    null
  );
};

const getRejectedAt = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.rejected_at ||
    t.rejectedAt ||
    t.updated_at ||
    t.updatedAt ||
    t.action_date ||
    null
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "administrator";

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [depositData, setDepositData] = useState({
    amount: "",
    description: "",
  });

  const [withdrawData, setWithdrawData] = useState({
    amount: "",
    description: "",
  });

  const [transferData, setTransferData] = useState({
    toMemberId: "",
    amount: "",
    description: "",
  });

  // Fetch user profile and balance
  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await response.json();
      if (data.members) {
        const currentUser = data.members.find((m) => m.id === user?.id);
        if (currentUser) {
          setUserProfile(currentUser);
          setBalance(currentUser.balance || 0);
          return currentUser;
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await response.json();
      if (data.members) {
        const filtered = data.members.filter((m) => m.id !== user?.id);
        setMembers(filtered);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const data = await response.json();
      if (data.transactions) {
        const userTransactions = data.transactions.filter(
          (t) => t.memberId === user?.id,
        );
        setTransactions(userTransactions.slice(0, 10));

        const pending = userTransactions.filter((t) => t.status === "pending");
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchMembers(),
        fetchTransactions(),
      ]);
      toast.success("✅ Data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      refreshData();
    }
  }, [user?.id]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositData.amount);

    console.log("💰 Deposit attempt:", { amount, user });

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Fetching user profile...");
      const profileResponse = await fetch(`${API_BASE_URL}/api/members.php`);
      const profileData = await profileResponse.json();
      console.log("📥 Profile data:", profileData);

      const currentUser = profileData.members?.find((m) => m.id === user?.id);

      if (!currentUser) {
        toast.error("User profile not found. Please refresh and try again.");
        setLoading(false);
        return;
      }

      console.log("👤 Current user:", currentUser);

      const transactionData = {
        memberId: currentUser.id,
        memberName: currentUser.name || user.name || "User",
        accountNumber: currentUser.accountNumber || "N/A",
        type: "deposit",
        amount: amount,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        description: depositData.description || "Deposit request",
      };

      console.log(
        "📤 Sending transaction:",
        JSON.stringify(transactionData, null, 2),
      );

      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      console.log("📥 Response status:", response.status);

      const responseText = await response.text();
      console.log("📥 Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON:", parseError);
        toast.error(
          "Server returned invalid response. Please check server logs.",
        );
        setLoading(false);
        return;
      }

      console.log("📥 Parsed response:", data);

      if (response.ok) {
        toast.success("✅ Deposit request submitted for admin approval!");
        setShowDepositModal(false);
        setDepositData({ amount: "", description: "" });
        await refreshData();
        toast.success("⏳ Your deposit is pending admin approval");
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
        console.error("❌ Error response:", data);
      }
    } catch (error) {
      console.error("❌ Error submitting deposit:", error);
      const errorMsg = error.message || "Failed to submit deposit";
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawData.amount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(balance)}`,
      );
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/members.php`);
      const profileData = await profileResponse.json();
      const currentUser = profileData.members?.find((m) => m.id === user?.id);

      const transactionData = {
        memberId: currentUser?.id || user.id,
        memberName: currentUser?.name || user.name || "User",
        accountNumber:
          currentUser?.accountNumber || user.accountNumber || "N/A",
        type: "withdrawal",
        amount: amount,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        description: withdrawData.description || "Withdrawal request",
      };

      console.log("📤 Sending withdrawal:", transactionData);

      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        toast.error("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Withdrawal request submitted for admin approval!");
        setShowWithdrawModal(false);
        setWithdrawData({ amount: "", description: "" });
        await refreshData();
        toast.success("⏳ Your withdrawal is pending admin approval");
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
        console.error("❌ Error response:", data);
      }
    } catch (error) {
      console.error("❌ Error submitting withdrawal:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = parseFloat(transferData.amount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(balance)}`,
      );
      return;
    }

    if (!transferData.toMemberId) {
      toast.error("Please select a recipient");
      return;
    }

    const toMember = members.find(
      (m) => m.id === parseInt(transferData.toMemberId),
    );
    if (!toMember) {
      toast.error("Recipient not found");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/api/members.php`);
      const profileData = await profileResponse.json();
      const currentUser = profileData.members?.find((m) => m.id === user?.id);

      const transferPayload = {
        fromMemberId: currentUser?.id || user.id,
        toMemberId: toMember.id,
        fromMemberName: currentUser?.name || user.name || "User",
        toMemberName: toMember.name || toMember.full_name || "Recipient",
        fromAccountNumber:
          currentUser?.accountNumber || user.accountNumber || "N/A",
        toAccountNumber:
          toMember.accountNumber || toMember.membership_number || "N/A",
        amount: amount,
        date: new Date().toISOString().split("T")[0],
        description:
          transferData.description ||
          `Transfer to ${toMember.name || toMember.full_name}`,
      };

      console.log("📤 Sending transfer:", transferPayload);

      const response = await fetch(`${API_BASE_URL}/api/transfers.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transferPayload),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        toast.error("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Transfer request submitted for admin approval!");
        setShowTransferModal(false);
        setTransferData({ toMemberId: "", amount: "", description: "" });
        await refreshData();
        toast.success("⏳ Your transfer is pending admin approval");
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
        console.error("❌ Error response:", data);
      }
    } catch (error) {
      console.error("❌ Error submitting transfer:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "approved":
      case "completed":
        return {
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          color: "#34d399",
        };
      case "pending":
        return {
          backgroundColor: "rgba(234, 179, 8, 0.2)",
          color: "#fbbf24",
        };
      case "rejected":
      case "failed":
        return {
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          color: "#f87171",
        };
      default:
        return {
          backgroundColor: "rgba(156, 163, 175, 0.2)",
          color: "#9ca3af",
        };
    }
  };

  const displayName =
    userProfile?.name || user?.full_name || user?.name || "User";
  const displayAccount =
    userProfile?.accountNumber ||
    user?.accountNumber ||
    user?.membership_number ||
    "N/A";
  const displayJoinDate =
    userProfile?.joinDate || user?.join_date || user?.joinDate || new Date();

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 16px;
        }
        .modal-content {
          background-color: #1e293b;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .modal-title {
          font-size: 18px;
          font-weight: bold;
          color: white;
        }
        .modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          font-size: 24px;
        }
        .modal-close:hover {
          color: white;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #d1d5db;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: #10b981;
        }
        .form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-select:focus {
          border-color: #10b981;
        }
        .form-select option {
          background-color: #1e293b;
        }
        .btn-submit {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(to right, #059669, #0d9488);
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-submit:hover {
          opacity: 0.9;
          transform: scale(1.01);
        }
        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-cancel {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background-color: rgba(255,255,255,0.05);
        }
        .modal-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        .modal-buttons button {
          flex: 1;
        }
        .refresh-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ color: "white", fontSize: "24px", margin: 0 }}>
            Welcome back, {displayName}! 👋
          </h1>
          <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
            {isAdmin ? "👑 Admin Dashboard" : "👤 Member Dashboard"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              padding: "10px 20px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "8px",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.3s",
              opacity: refreshing ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {refreshing ? (
              <>
                <span className="refresh-spinner">⟳</span> Refreshing...
              </>
            ) : (
              "🔄 Refresh"
            )}
          </button>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              padding: "10px 20px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "10px",
                borderRadius: "10px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
              }}
            >
              <span style={{ fontSize: "24px" }}>💰</span>
            </div>
            <div>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  margin: "0 0 4px 0",
                }}
              >
                Balance
              </p>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "#34d399",
                  margin: 0,
                }}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "10px",
                borderRadius: "10px",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
              }}
            >
              <span style={{ fontSize: "24px" }}>🏦</span>
            </div>
            <div>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  margin: "0 0 4px 0",
                }}
              >
                Account
              </p>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "white",
                  margin: 0,
                }}
              >
                {displayAccount}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "10px",
                borderRadius: "10px",
                backgroundColor: "rgba(234, 179, 8, 0.2)",
              }}
            >
              <span style={{ fontSize: "24px" }}>⏳</span>
            </div>
            <div>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  margin: "0 0 4px 0",
                }}
              >
                Pending
              </p>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "#fbbf24",
                  margin: 0,
                }}
              >
                {pendingCount}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "10px",
                borderRadius: "10px",
                backgroundColor: "rgba(139, 92, 246, 0.2)",
              }}
            >
              <span style={{ fontSize: "24px" }}>📅</span>
            </div>
            <div>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  margin: "0 0 4px 0",
                }}
              >
                Joined
              </p>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "white",
                  margin: 0,
                }}
              >
                {formatDate(displayJoinDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Member */}
      {!isAdmin && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={() => setShowDepositModal(true)}
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              padding: "16px",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(16, 185, 129, 0.25)";
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
              e.target.style.transform = "scale(1)";
            }}
          >
            💰 Deposit
          </button>

          <button
            onClick={() => setShowWithdrawModal(true)}
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              padding: "16px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(239, 68, 68, 0.25)";
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
              e.target.style.transform = "scale(1)";
            }}
          >
            💸 Withdraw
          </button>

          <button
            onClick={() => {
              if (members.length === 0) {
                toast.error("No other members available for transfer");
                return;
              }
              setShowTransferModal(true);
            }}
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.15)",
              color: "#a78bfa",
              padding: "16px",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(139, 92, 246, 0.25)";
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(139, 92, 246, 0.15)";
              e.target.style.transform = "scale(1)";
            }}
          >
            🔄 Transfer
          </button>

          <button
            onClick={() => navigate("/member/borrowing")}
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.15)",
              color: "#fbbf24",
              padding: "16px",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(251, 191, 36, 0.25)";
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(251, 191, 36, 0.15)";
              e.target.style.transform = "scale(1)";
            }}
          >
            💳 Borrow
          </button>
        </div>
      )}

      {/* Admin Quick Actions */}
      {isAdmin && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={() => navigate("/admin/members")}
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              padding: "16px",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
          >
            👥 Manage Members
          </button>

          <button
            onClick={() => navigate("/admin/pending")}
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              padding: "16px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
          >
            ⏳ Pending Approvals
            {pendingCount > 0 && (
              <span
                style={{
                  marginLeft: "8px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "50%",
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/admin/reports")}
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.15)",
              color: "#a78bfa",
              padding: "16px",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
          >
            📊 View Reports
          </button>

          <button
            onClick={() => navigate("/admin/loans")}
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.15)",
              color: "#fbbf24",
              padding: "16px",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.3s",
            }}
          >
            💳 Loan Management
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ color: "white", margin: 0 }}>📊 Recent Transactions</h3>
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              background: "none",
              border: "none",
              color: "#60a5fa",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            {refreshing ? "⟳ Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
        {transactions.length > 0 ? (
          <div>
            {transactions.map((t) => {
              const rejectionReason = getRejectionReason(t);
              const rejectedBy = getRejectedBy(t);
              const rejectedAt = getRejectedAt(t);
              const isRejected =
                t.status === "rejected" || t.status === "failed";

              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "white", fontSize: "14px" }}>
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                      {t.type === "transfer" &&
                        ` to ${t.toMemberName || "Recipient"}`}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                      {t.description || "No description"}
                    </div>

                    {/* Rejection reason — shown only for rejected/failed transactions */}
                    {isRejected && rejectionReason && (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "8px 10px",
                          backgroundColor: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "6px",
                          color: "#fca5a5",
                          fontSize: "12px",
                          lineHeight: 1.4,
                        }}
                      >
                        <div style={{ fontWeight: "600", color: "#f87171" }}>
                          ❌ Rejection reason
                        </div>
                        <div style={{ marginTop: "2px" }}>
                          {rejectionReason}
                        </div>
                        {(rejectedBy || rejectedAt) && (
                          <div
                            style={{
                              color: "#9ca3af",
                              fontSize: "11px",
                              marginTop: "4px",
                            }}
                          >
                            {rejectedBy && <>By: {rejectedBy}</>}
                            {rejectedBy && rejectedAt && " • "}
                            {rejectedAt && formatDate(rejectedAt)}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ color: "#6b7280", fontSize: "11px" }}>
                      {formatDate(t.date)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        color:
                          t.type === "deposit" || t.type === "transfer_in"
                            ? "#34d399"
                            : "#f87171",
                        fontWeight: "600",
                      }}
                    >
                      {t.type === "deposit" || t.type === "transfer_in"
                        ? "+"
                        : "-"}
                      {formatCurrency(t.amount)}
                    </div>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "10px",
                        ...getStatusBadgeStyle(t.status),
                      }}
                    >
                      {t.status}
                      {t.status === "pending" && " ⏳"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{ textAlign: "center", color: "#9ca3af", padding: "20px" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>📭</div>
            <p>No recent transactions</p>
            <p style={{ fontSize: "14px" }}>
              Start using the app to see activity here
            </p>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💰 Deposit Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowDepositModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={depositData.amount}
                  onChange={(e) =>
                    setDepositData({ ...depositData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  💡 This will be reviewed by an admin before approval
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={depositData.description}
                  onChange={(e) =>
                    setDepositData({
                      ...depositData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowDepositModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Processing..." : "Submit Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💸 Withdraw Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowWithdrawModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={withdrawData.amount}
                  onChange={(e) =>
                    setWithdrawData({ ...withdrawData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  Available balance: {formatCurrency(balance)}
                </div>
                <div
                  style={{
                    color: "#fbbf24",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  ⏳ This will be reviewed by an admin before approval
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={withdrawData.description}
                  onChange={(e) =>
                    setWithdrawData({
                      ...withdrawData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Processing..." : "Submit Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🔄 Transfer Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransferModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label className="form-label">Recipient *</label>
                <select
                  className="form-select"
                  value={transferData.toMemberId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      toMemberId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select a member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.full_name} -{" "}
                      {m.accountNumber || m.membership_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  Available balance: {formatCurrency(balance)}
                </div>
                <div
                  style={{
                    color: "#fbbf24",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  ⏳ This will be reviewed by an admin before approval
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferData.description}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTransferModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Processing..." : "Submit Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
