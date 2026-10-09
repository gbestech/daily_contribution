// src/components/member/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

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

// ============================================================
// Savings plan calculation helpers
// ============================================================
const DURATION_MONTHS = {
  "6 months": 6,
  "1 year": 12,
  "2 years": 24,
  "3 years": 36,
  "4 years": 48,
};

const PERIODS_PER_MONTH = {
  Daily: 30,
  Weekly: 4,
  Monthly: 1,
  Random: 1,
};

const computePlanSummary = (plan, duration, amountPerPeriod) => {
  if (!plan || !duration) return null;
  const amt = parseFloat(amountPerPeriod);
  if (isNaN(amt) || amt <= 0) return null;
  if (plan === "Random") {
    return {
      plan,
      duration,
      totalPeriods: null,
      perPeriod: amt,
      total: null,
      periodLabel: "per period",
      isRandom: true,
    };
  }
  const months = DURATION_MONTHS[duration];
  const perMonth = PERIODS_PER_MONTH[plan];
  if (!months || !perMonth) return null;

  const totalPeriods = months * perMonth;
  const total = amt * totalPeriods;

  return {
    plan,
    duration,
    totalPeriods,
    perPeriod: amt,
    total,
    periodLabel:
      plan === "Daily"
        ? "per day"
        : plan === "Weekly"
          ? "per week"
          : "per month",
    isRandom: false,
  };
};

// ============================================================
// 🆕 Detect the current theme (light / dark)
// ============================================================
const detectTheme = () => {
  if (typeof document === "undefined") return "dark";

  const html = document.documentElement;
  const body = document.body;

  const attr =
    html.getAttribute("data-theme") || body?.getAttribute("data-theme") || "";
  if (attr.toLowerCase().includes("light")) return "light";
  if (attr.toLowerCase().includes("dark")) return "dark";

  const cls = `${html.className} ${body?.className || ""}`.toLowerCase();
  if (cls.includes("light")) return "light";
  if (cls.includes("dark")) return "dark";

  try {
    const keys = [
      "theme",
      "app-theme",
      "color-theme",
      "colorMode",
      "color-mode",
      "mui-mode",
      "chakra-ui-color-mode",
    ];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && /light/i.test(v)) return "light";
      if (v && /dark/i.test(v)) return "dark";
    }
  } catch {}

  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }

  return "dark";
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

  // 🆕 Theme tracking
  const [theme, setTheme] = useState(() => detectTheme());

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

  // ============================================================
  // 🆕 Watch for theme changes and re-render with new colors
  // ============================================================
  useEffect(() => {
    const update = () => setTheme(detectTheme());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });
    }

    window.addEventListener("storage", update);
    const interval = setInterval(update, 800);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // 🆕 Theme color palette — background + text always paired
  // ============================================================
  const isLight = theme === "light";

  // Main text / surfaces
  const textColor = isLight ? "#0f172a" : "#f1f5f9";
  const textMuted = isLight ? "#475569" : "#94a3b8";
  const textDim = isLight ? "#64748b" : "#64748b";

  // Input fields — explicitly paired background + text
  const fieldBg = isLight ? "#ffffff" : "#0f172a";
  const fieldText = isLight ? "#0f172a" : "#f1f5f9";
  const fieldPlaceholder = isLight ? "#94a3b8" : "#64748b";
  const fieldBorder = isLight
    ? "rgba(15,23,42,0.20)"
    : "rgba(255,255,255,0.15)";
  const fieldFocusBorder = "#10b981";

  // Card / surface
  const cardBg = isLight ? "#ffffff" : "rgba(255, 255, 255, 0.05)";
  const cardBorder = isLight
    ? "rgba(15, 23, 42, 0.10)"
    : "rgba(255, 255, 255, 0.10)";
  const cardSurface = isLight ? "#f8fafc" : "rgba(255, 255, 255, 0.05)";
  const cardSurface2 = isLight ? "#f1f5f9" : "rgba(255, 255, 255, 0.08)";

  // Modal
  const modalBg = isLight ? "#ffffff" : "#1e293b";
  const modalText = isLight ? "#0f172a" : "#f1f5f9";
  const modalBorder = isLight
    ? "rgba(15, 23, 42, 0.10)"
    : "rgba(255, 255, 255, 0.10)";

  // Accent colors
  const accentColor = "#10b981";
  const creditColor = isLight ? "#059669" : "#34d399";
  const warningColor = isLight ? "#d97706" : "#fbbf24";
  const debitColor = isLight ? "#dc2626" : "#f87171";
  const purpleColor = isLight ? "#7c3aed" : "#a78bfa";
  const infoColor = isLight ? "#2563eb" : "#60a5fa";

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

  const refreshData = async (silent = false) => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchMembers(),
        fetchTransactions(),
      ]);
      if (!silent) toast.success("✅ Data refreshed");
    } catch (error) {
      console.error("Error refreshing data:", error);
      if (!silent) toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      refreshData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ============================================================
  // Deposit validation against the member's savings plan
  // ============================================================
  const validateDepositAgainstPlan = (amount) => {
    const plan = computePlanSummary(
      userProfile?.savings_plan,
      userProfile?.duration,
      userProfile?.amount,
    );
    if (!plan) return { ok: true };
    if (plan.isRandom) return { ok: true };

    const expected = parseFloat(plan.perPeriod);
    if (isNaN(expected) || expected <= 0) return { ok: true };

    const amt = parseFloat(amount);
    const diff = amt - expected;
    const EPS = 0.01;

    if (diff > EPS) {
      return {
        ok: false,
        reason: "greater",
        expected,
        message: `❌ Deposit amount is GREATER than your savings plan.\n\nYour plan expects ${formatCurrency(expected)} ${plan.periodLabel}.\nYou entered ${formatCurrency(amt)}.`,
      };
    }
    if (diff < -EPS) {
      return {
        ok: false,
        reason: "less",
        expected,
        message: `❌ Deposit amount is LESS than your savings plan.\n\nYour plan expects ${formatCurrency(expected)} ${plan.periodLabel}.\nYou entered ${formatCurrency(amt)}.`,
      };
    }
    return { ok: true, expected };
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositData.amount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const planCheck = validateDepositAgainstPlan(amount);
    if (!planCheck.ok) {
      toast.error(planCheck.message, { duration: 6000 });
      window.alert(planCheck.message);
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

      if (!currentUser) {
        toast.error("User profile not found. Please refresh and try again.");
        setLoading(false);
        return;
      }

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
      } catch {
        toast.error("Server returned invalid response.");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Deposit submitted for approval");
        setShowDepositModal(false);
        setDepositData({ amount: "", description: "" });
        await refreshData(true);
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error(`❌ ${error.message || "Failed to submit deposit"}`);
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
      } catch {
        toast.error("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Withdrawal submitted for approval");
        setShowWithdrawModal(false);
        setWithdrawData({ amount: "", description: "" });
        await refreshData(true);
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
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
      } catch {
        toast.error("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Transfer submitted for approval");
        setShowTransferModal(false);
        setTransferData({ toMemberId: "", amount: "", description: "" });
        await refreshData(true);
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out");
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "approved":
      case "completed":
        return {
          backgroundColor: isLight
            ? "rgba(5, 150, 105, 0.15)"
            : "rgba(16, 185, 129, 0.2)",
          color: creditColor,
        };
      case "pending":
        return {
          backgroundColor: isLight
            ? "rgba(217, 119, 6, 0.15)"
            : "rgba(234, 179, 8, 0.2)",
          color: warningColor,
        };
      case "rejected":
      case "failed":
        return {
          backgroundColor: isLight
            ? "rgba(220, 38, 38, 0.15)"
            : "rgba(239, 68, 68, 0.2)",
          color: debitColor,
        };
      default:
        return {
          backgroundColor: isLight
            ? "rgba(100, 116, 139, 0.15)"
            : "rgba(156, 163, 175, 0.2)",
          color: textMuted,
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

  const planSummary = computePlanSummary(
    userProfile?.savings_plan,
    userProfile?.duration,
    userProfile?.amount,
  );
  const savingsMethod =
    userProfile?.savings_method || user?.savings_method || "";
  const itemName = userProfile?.item_name || "";

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: isLight ? "#f8fafc" : "#0f172a",
        minHeight: "100vh",
        color: textColor,
      }}
    >
      {/* ============================================================ */}
      {/* 🆕 THEME-AWARE STYLES — hardcoded colors, both themes readable */}
      {/* ============================================================ */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-wrap { color: ${textColor}; color-scheme: ${isLight ? "light" : "dark"}; }
        .dash-wrap * { box-sizing: border-box; }

        /* ===== MODAL ===== */
        .modal-overlay {
          position: fixed; inset: 0;
          background-color: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; padding: 16px;
        }
        .modal-content {
          background-color: ${modalBg};
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid ${modalBorder};
          color: ${modalText};
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        .modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 16px;
        }
        .modal-title {
          font-size: 18px; font-weight: bold;
          color: ${modalText};
        }
        .modal-close {
          background: none; border: none;
          color: ${textMuted};
          cursor: pointer; padding: 4px; font-size: 24px;
          line-height: 1;
          transition: color 0.2s;
        }
        .modal-close:hover { color: ${modalText}; }

        /* ===== FORM ELEMENTS ===== */
        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 14px; font-weight: 500;
          color: ${modalText}; margin-bottom: 6px;
        }
        .form-input,
        .form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background-color: ${fieldBg} !important;
          color: ${fieldText} !important;
          -webkit-text-fill-color: ${fieldText} !important;
          caret-color: ${accentColor};
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }
        .form-input:focus,
        .form-select:focus {
          border-color: ${fieldFocusBorder};
          background-color: ${fieldBg} !important;
          color: ${fieldText} !important;
          -webkit-text-fill-color: ${fieldText} !important;
        }
        .form-input::placeholder {
          color: ${fieldPlaceholder} !important;
          -webkit-text-fill-color: ${fieldPlaceholder} !important;
          opacity: 1;
        }
        .form-select option {
          background-color: ${modalBg};
          color: ${fieldText};
        }
        /* Autofill override */
        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover,
        .form-input:-webkit-autofill:focus,
        .form-select:-webkit-autofill {
          -webkit-text-fill-color: ${fieldText} !important;
          -webkit-box-shadow: 0 0 0 1000px ${fieldBg} inset !important;
          box-shadow: 0 0 0 1000px ${fieldBg} inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .form-input::selection,
        .form-select::selection {
          background: ${accentColor};
          color: #ffffff;
        }
        /* Kill number spinners */
        .form-input[type="number"]::-webkit-outer-spin-button,
        .form-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        .form-input[type="number"] { -moz-appearance: textfield; }

        /* ===== BUTTONS ===== */
        .btn-submit {
          width: 100%; padding: 12px; border-radius: 8px; border: none;
          background: linear-gradient(to right, #059669, #0d9488);
          color: #ffffff; font-size: 16px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-submit:hover:not(:disabled) { opacity: 0.9; transform: scale(1.01); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-cancel {
          width: 100%; padding: 12px; border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background: transparent;
          color: ${modalText};
          font-size: 16px; cursor: pointer; transition: all 0.2s;
        }
        .btn-cancel:hover { background-color: ${cardSurface2}; }
        .modal-buttons {
          display: flex; gap: 12px; margin-top: 16px;
        }
        .modal-buttons button { flex: 1; }

        .refresh-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        /* ===== SAVINGS PLAN SUMMARY ===== */
        .plan-summary {
          background-color: ${cardSurface};
          border: 1px solid ${cardBorder};
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .plan-summary-header {
          display: flex; justify-content: space-between;
          align-items: center; gap: 12px;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .plan-summary-title {
          color: ${textColor}; margin: 0; font-size: 16px;
        }
        .plan-summary-badges {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .plan-badge {
          padding: 4px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .plan-badge-green {
          background: ${isLight ? "rgba(5,150,105,0.15)" : "rgba(16,185,129,0.2)"};
          color: ${creditColor};
        }
        .plan-badge-blue {
          background: ${isLight ? "rgba(37,99,235,0.15)" : "rgba(59,130,246,0.2)"};
          color: ${infoColor};
        }
        .plan-badge-purple {
          background: ${isLight ? "rgba(124,58,237,0.15)" : "rgba(139,92,246,0.2)"};
          color: ${purpleColor};
        }
        .plan-badge-yellow {
          background: ${isLight ? "rgba(217,119,6,0.15)" : "rgba(234,179,8,0.2)"};
          color: ${warningColor};
        }
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .plan-cell { min-width: 0; }
        .plan-cell-label {
          font-size: 11px; font-weight: 600;
          color: ${textMuted};
          text-transform: uppercase;
          letter-spacing: 0.4px; margin-bottom: 4px;
        }
        .plan-cell-value {
          font-size: 16px; font-weight: 600;
          color: ${textColor};
          word-break: break-word;
        }
        .plan-cell-value.accent {
          color: ${creditColor}; font-size: 20px;
        }
        .plan-empty {
          text-align: center; padding: 24px;
          color: ${textMuted}; font-size: 14px;
        }
        .plan-empty-icon { font-size: 40px; margin-bottom: 8px; }

        @media (max-width: 640px) {
          .plan-summary { padding: 16px; }
          .plan-cell-value { font-size: 15px; }
          .plan-cell-value.accent { font-size: 18px; }
        }
      `}</style>

      <div className="dash-wrap">
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
            <h1 style={{ color: textColor, fontSize: "24px", margin: 0 }}>
              Welcome back, {displayName}! 👋
            </h1>
            <p style={{ color: textMuted, margin: "4px 0 0 0" }}>
              {isAdmin ? "👑 Admin Dashboard" : "👤 Member Dashboard"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => refreshData(false)}
              disabled={refreshing}
              style={{
                backgroundColor: isLight
                  ? "rgba(37,99,235,0.1)"
                  : "rgba(59, 130, 246, 0.15)",
                color: infoColor,
                padding: "10px 20px",
                border: `1px solid ${isLight ? "rgba(37,99,235,0.25)" : "rgba(59, 130, 246, 0.2)"}`,
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
                backgroundColor: isLight
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(239, 68, 68, 0.15)",
                color: debitColor,
                padding: "10px 20px",
                border: `1px solid ${isLight ? "rgba(220,38,38,0.25)" : "rgba(239, 68, 68, 0.2)"}`,
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
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(5,150,105,0.15)"
                    : "rgba(16, 185, 129, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>💰</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
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
                    color: creditColor,
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
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(37,99,235,0.15)"
                    : "rgba(59, 130, 246, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>🏦</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
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
                    color: textColor,
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
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(217,119,6,0.15)"
                    : "rgba(234, 179, 8, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>⏳</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
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
                    color: warningColor,
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
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(124,58,237,0.15)"
                    : "rgba(139, 92, 246, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>📅</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
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
                    color: textColor,
                    margin: 0,
                  }}
                >
                  {formatDate(displayJoinDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Plan Summary */}
        {!isAdmin && (
          <div className="plan-summary">
            <div className="plan-summary-header">
              <h3 className="plan-summary-title">💼 My Savings Plan</h3>
              {planSummary && (
                <div className="plan-summary-badges">
                  <span className="plan-badge plan-badge-green">
                    {planSummary.plan}
                  </span>
                  {savingsMethod && (
                    <span className="plan-badge plan-badge-purple">
                      {savingsMethod === "Item"
                        ? `📦 ${itemName || "Item"}`
                        : "💵 Cash"}
                    </span>
                  )}
                  <span className="plan-badge plan-badge-blue">
                    {planSummary.duration}
                  </span>
                </div>
              )}
            </div>

            {!planSummary ? (
              <div className="plan-empty">
                <div className="plan-empty-icon">📭</div>
                <p style={{ margin: 0 }}>
                  No savings plan set yet. Visit your profile to create one.
                </p>
              </div>
            ) : (
              <div className="plan-grid">
                <div className="plan-cell">
                  <div className="plan-cell-label">Savings Plan</div>
                  <div className="plan-cell-value">
                    {planSummary.plan === "Random"
                      ? "Random"
                      : `${planSummary.plan}`}
                  </div>
                </div>

                <div className="plan-cell">
                  <div className="plan-cell-label">Savings Method</div>
                  <div className="plan-cell-value">
                    {savingsMethod === "Item"
                      ? `📦 ${itemName || "Item"}`
                      : savingsMethod === "Cash"
                        ? "💵 Cash"
                        : "—"}
                  </div>
                </div>

                <div className="plan-cell">
                  <div className="plan-cell-label">Duration</div>
                  <div className="plan-cell-value">{planSummary.duration}</div>
                </div>

                <div className="plan-cell">
                  <div className="plan-cell-label">
                    {planSummary.isRandom
                      ? "Amount"
                      : `Amount ${planSummary.periodLabel}`}
                  </div>
                  <div className="plan-cell-value accent">
                    {formatCurrency(planSummary.perPeriod)}
                  </div>
                </div>

                {!planSummary.isRandom && (
                  <>
                    <div className="plan-cell">
                      <div className="plan-cell-label">Number of Payments</div>
                      <div className="plan-cell-value">
                        {planSummary.totalPeriods}
                      </div>
                    </div>

                    <div className="plan-cell">
                      <div className="plan-cell-label">Total to Save</div>
                      <div className="plan-cell-value accent">
                        {formatCurrency(planSummary.total)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
                backgroundColor: isLight
                  ? "rgba(5,150,105,0.1)"
                  : "rgba(16, 185, 129, 0.15)",
                color: creditColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(5,150,105,0.25)" : "rgba(16, 185, 129, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              💰 Deposit
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              style={{
                backgroundColor: isLight
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(239, 68, 68, 0.15)",
                color: debitColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(220,38,38,0.25)" : "rgba(239, 68, 68, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
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
                backgroundColor: isLight
                  ? "rgba(124,58,237,0.1)"
                  : "rgba(139, 92, 246, 0.15)",
                color: purpleColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(124,58,237,0.25)" : "rgba(139, 92, 246, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              🔄 Transfer
            </button>

            <button
              onClick={() => navigate("/member/borrowing")}
              style={{
                backgroundColor: isLight
                  ? "rgba(217,119,6,0.1)"
                  : "rgba(251, 191, 36, 0.15)",
                color: warningColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(217,119,6,0.25)" : "rgba(251, 191, 36, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
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
                backgroundColor: isLight
                  ? "rgba(5,150,105,0.1)"
                  : "rgba(16, 185, 129, 0.15)",
                color: creditColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(5,150,105,0.25)" : "rgba(16, 185, 129, 0.2)"}`,
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
                backgroundColor: isLight
                  ? "rgba(37,99,235,0.1)"
                  : "rgba(59, 130, 246, 0.15)",
                color: infoColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(37,99,235,0.25)" : "rgba(59, 130, 246, 0.2)"}`,
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
                    backgroundColor: debitColor,
                    color: "#ffffff",
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
                backgroundColor: isLight
                  ? "rgba(124,58,237,0.1)"
                  : "rgba(139, 92, 246, 0.15)",
                color: purpleColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(124,58,237,0.25)" : "rgba(139, 92, 246, 0.2)"}`,
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
                backgroundColor: isLight
                  ? "rgba(217,119,6,0.1)"
                  : "rgba(251, 191, 36, 0.15)",
                color: warningColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(217,119,6,0.25)" : "rgba(251, 191, 36, 0.2)"}`,
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
            backgroundColor: cardSurface,
            borderRadius: "12px",
            border: `1px solid ${cardBorder}`,
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
            <h3 style={{ color: textColor, margin: 0 }}>
              📊 Recent Transactions
            </h3>
            <button
              onClick={() => refreshData(false)}
              disabled={refreshing}
              style={{
                background: "none",
                border: "none",
                color: infoColor,
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
                      borderBottom: `1px solid ${cardBorder}`,
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: textColor, fontSize: "14px" }}>
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                        {t.type === "transfer" &&
                          ` to ${t.toMemberName || "Recipient"}`}
                      </div>
                      <div style={{ color: textMuted, fontSize: "12px" }}>
                        {t.description || "No description"}
                      </div>

                      {isRejected && rejectionReason && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "8px 10px",
                            backgroundColor: isLight
                              ? "rgba(220,38,38,0.06)"
                              : "rgba(239, 68, 68, 0.08)",
                            border: `1px solid ${isLight ? "rgba(220,38,38,0.2)" : "rgba(239, 68, 68, 0.25)"}`,
                            borderRadius: "6px",
                            color: isLight ? "#991b1b" : "#fca5a5",
                            fontSize: "12px",
                            lineHeight: 1.4,
                          }}
                        >
                          <div style={{ fontWeight: "600", color: debitColor }}>
                            ❌ Rejection reason
                          </div>
                          <div style={{ marginTop: "2px" }}>
                            {rejectionReason}
                          </div>
                          {(rejectedBy || rejectedAt) && (
                            <div
                              style={{
                                color: textMuted,
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

                      <div style={{ color: textDim, fontSize: "11px" }}>
                        {formatDate(t.date)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          color:
                            t.type === "deposit" || t.type === "transfer_in"
                              ? creditColor
                              : debitColor,
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
              style={{
                textAlign: "center",
                color: textMuted,
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📭</div>
              <p>No recent transactions</p>
              <p style={{ fontSize: "14px" }}>
                Start using the app to see activity here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== DEPOSIT MODAL ===== */}
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
                {planSummary && !planSummary.isRandom && (
                  <div
                    style={{
                      color: textMuted,
                      fontSize: "12px",
                      marginTop: "6px",
                    }}
                  >
                    💡 Your savings plan expects{" "}
                    <strong style={{ color: creditColor }}>
                      {formatCurrency(planSummary.perPeriod)}
                    </strong>{" "}
                    {planSummary.periodLabel}.
                  </div>
                )}
                {planSummary && planSummary.isRandom && (
                  <div
                    style={{
                      color: textMuted,
                      fontSize: "12px",
                      marginTop: "6px",
                    }}
                  >
                    💡 Random plan — enter any amount you wish to save.
                  </div>
                )}
                <div
                  style={{
                    color: textMuted,
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

      {/* ===== WITHDRAW MODAL ===== */}
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
                    color: textMuted,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  Available balance: {formatCurrency(balance)}
                </div>
                <div
                  style={{
                    color: warningColor,
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

      {/* ===== TRANSFER MODAL ===== */}
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
                    color: textMuted,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  Available balance: {formatCurrency(balance)}
                </div>
                <div
                  style={{
                    color: warningColor,
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
