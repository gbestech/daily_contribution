// src/components/member/Borrowing.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

// ============================================================
// Detect the current theme (light / dark)
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

const Borrowing = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [userData, setUserData] = useState(null);

  // 🆕 Theme tracking
  const [theme, setTheme] = useState(() => detectTheme());

  const [loanSettings, setLoanSettings] = useState({
    min_membership_days: 180,
    interest_rate: 5,
    max_duration_months: 6,
    enable_loan_requests: true,
    require_admin_approval: true,
    auto_approve_small_loans: false,
    small_loan_threshold: 5000,
    late_payment_penalty: 10,
    grace_period_days: 7,
  });
  const [loanDetails, setLoanDetails] = useState({
    amount: 0,
    savings: 0,
    maxBorrow: 0,
    minBorrow: 0,
    interest: 0,
    totalPayable: 0,
    monthlyPayment: 0,
    durationMonths: 6,
    membershipDays: 0,
    isEligible: false,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const hasFetched = useRef(false);

  // ============================================================
  // 🆕 Watch for theme changes
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
  // 🆕 Theme-aware color palette
  // ============================================================
  const isLight = theme === "light";

  // Text
  const textColor = isLight ? "#0f172a" : "#f1f5f9";
  const textMuted = isLight ? "#475569" : "#94a3b8";
  const textDim = isLight ? "#64748b" : "#64748b";

  // Input fields — explicit background + text pairing
  const fieldBg = isLight ? "#ffffff" : "#0f172a";
  const fieldText = isLight ? "#0f172a" : "#f1f5f9";
  const fieldPlaceholder = isLight ? "#94a3b8" : "#64748b";
  const fieldBorder = isLight
    ? "rgba(15,23,42,0.20)"
    : "rgba(255,255,255,0.15)";
  const fieldFocusBorder = "#10b981";

  // Surfaces
  const pageBg = isLight ? "#f8fafc" : "#0f172a";
  const cardBg = isLight ? "#ffffff" : "rgba(255,255,255,0.03)";
  const cardBorder = isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.05)";
  const cardSurface = isLight ? "#f8fafc" : "rgba(255,255,255,0.05)";
  const cardSurface2 = isLight ? "#f1f5f9" : "rgba(255,255,255,0.08)";
  const tableHeaderBg = isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)";
  const rowBorder = isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.05)";

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

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAllData();
    }
  }, []);

  useEffect(() => {
    if (borrowAmount && userData) {
      calculateLoanDetails(parseFloat(borrowAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrowAmount, userData, loanSettings]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    const num = parseFloat(amount) || 0;
    return "₦" + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatNumber = (amount) => {
    if (!amount && amount !== 0) return "0.00";
    const num = parseFloat(amount) || 0;
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const fetchAllData = async () => {
    const settings = await fetchLoanSettings();
    await fetchUserData(settings);
    await fetchLoanHistory();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success("Data refreshed successfully!");
  };

  const fetchLoanSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings.php`);
      if (response.ok) {
        const result = await response.json();

        if (result.status === true && result.data && result.data.loan) {
          const settings = result.data.loan;

          const updatedSettings = {
            min_membership_days:
              settings.min_membership_days !== undefined
                ? settings.min_membership_days
                : 180,
            interest_rate:
              settings.interest_rate !== undefined ? settings.interest_rate : 0,
            max_duration_months:
              settings.max_duration_months !== undefined
                ? settings.max_duration_months
                : 6,
            enable_loan_requests:
              settings.enable_loan_requests !== undefined
                ? settings.enable_loan_requests
                : true,
            require_admin_approval:
              settings.require_admin_approval !== undefined
                ? settings.require_admin_approval
                : true,
            auto_approve_small_loans:
              settings.auto_approve_small_loans || false,
            small_loan_threshold: settings.small_loan_threshold || 5000,
            late_payment_penalty: settings.late_payment_penalty || 10,
            grace_period_days: settings.grace_period_days || 7,
          };

          setLoanSettings(updatedSettings);
          setLoanDetails((prev) => ({
            ...prev,
            durationMonths: settings.max_duration_months || 6,
          }));

          return updatedSettings;
        }
        return null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching loan settings:", error);
      return null;
    }
  };

  const fetchUserData = async (fetchedSettings = null) => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);

        const response = await fetch(`${API_BASE_URL}/api/members.php`);
        const data = await response.json();

        if (data.members) {
          const member = data.members.find((m) => m.id === user.id);
          if (member) {
            const joinDate = new Date(
              member.created_at || member.join_date || Date.now(),
            );
            const today = new Date();
            const diffTime = Math.abs(today - joinDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const minDays = fetchedSettings
              ? fetchedSettings.min_membership_days
              : loanSettings.min_membership_days || 180;

            const isEligible = diffDays >= minDays;
            const savings = parseFloat(member.balance || member.savings || 0);
            const maxBorrow = savings * 0.5;

            setLoanDetails((prev) => ({
              ...prev,
              savings: savings,
              maxBorrow: maxBorrow,
              membershipDays: diffDays,
              isEligible: isEligible,
              durationMonths: fetchedSettings
                ? fetchedSettings.max_duration_months || 6
                : loanSettings.max_duration_months || 6,
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to fetch user data");
    }
  };

  const fetchLoanHistory = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        toast.error("User not authenticated");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const response = await fetch(
        `${API_BASE_URL}/api/loans.php?user_id=${user.id}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setLoans([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setLoans([]);
        setLoading(false);
        return;
      }

      if (data.loans && Array.isArray(data.loans)) {
        const loansWithPaid = data.loans.map((loan) => ({
          ...loan,
          total_paid: parseFloat(loan.total_paid) || 0,
          amount: parseFloat(loan.amount) || 0,
          total_payable: parseFloat(loan.total_payable) || 0,
          interest: parseFloat(loan.interest) || 0,
          monthly_payment: parseFloat(loan.monthly_payment) || 0,
        }));
        setLoans(loansWithPaid);
      } else {
        setLoans([]);
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
      if (error.message && !error.message.includes("404")) {
        toast.error("Unable to load loan history");
      }
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateLoanDetails = (amount) => {
    const savings = loanDetails.savings || 0;
    const maxBorrow = savings * 0.5;

    const interestRate = (loanSettings.interest_rate || 0) / 100;
    const interest = amount * interestRate;
    const totalPayable = amount + interest;
    const durationMonths = loanSettings.max_duration_months || 6;
    const monthlyPayment = totalPayable / durationMonths;

    setLoanDetails((prev) => ({
      ...prev,
      amount: amount,
      maxBorrow: maxBorrow,
      interest: interest,
      totalPayable: totalPayable,
      monthlyPayment: monthlyPayment,
      durationMonths: durationMonths,
    }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    if (!selectedLoan) {
      toast.error("No loan selected");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalPaid = parseFloat(selectedLoan.total_paid) || 0;
    const remainingBalance = parseFloat(selectedLoan.total_payable) - totalPaid;

    if (amount > remainingBalance) {
      toast.error(
        `Amount exceeds remaining balance: ${formatCurrency(remainingBalance)}`,
      );
      return;
    }

    try {
      const paymentData = {
        loan_id: selectedLoan.id,
        user_id: userData.id,
        amount: amount,
        payment_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        note: `Payment for loan #${selectedLoan.id}`,
      };

      const response = await fetch(`${API_BASE_URL}/api/loan_payments.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(
          `✅ Payment of ${formatCurrency(amount)} submitted successfully!`,
        );
        setShowPaymentModal(false);
        setPaymentAmount("");
        setSelectedLoan(null);
        fetchLoanHistory();
        fetchUserData();
      } else {
        toast.error(data.message || "Failed to submit payment");
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error.message || "Failed to submit payment");
    }
  };

  const handleBorrowRequest = async (e) => {
    e.preventDefault();

    try {
      const amount = parseFloat(borrowAmount);
      const savings = loanDetails.savings;
      const maxBorrow = savings * 0.5;

      if (amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (amount > maxBorrow) {
        toast.error(
          `You can only borrow up to 50% of your savings (${formatCurrency(maxBorrow)})`,
        );
        return;
      }

      if (!loanDetails.isEligible) {
        const monthsNeeded = Math.ceil(
          (loanSettings.min_membership_days || 180) / 30,
        );
        if (monthsNeeded === 0) {
          toast.error(
            "You are not eligible to borrow yet. Please contact admin.",
          );
        } else {
          toast.error(
            `You need to be active for at least ${monthsNeeded} months (${Math.floor(loanDetails.membershipDays / 30)}/${monthsNeeded} months)`,
          );
        }
        return;
      }

      if (!loanSettings.enable_loan_requests) {
        toast.error(
          "Loan requests are currently disabled. Please contact admin.",
        );
        return;
      }

      const loanData = {
        user_id: userData.id,
        amount: amount,
        interest: loanDetails.interest,
        total_payable: loanDetails.totalPayable,
        duration_months: loanDetails.durationMonths,
        monthly_payment: loanDetails.monthlyPayment,
        status: "pending",
        request_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      };

      const response = await fetch(`${API_BASE_URL}/api/loans.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(loanData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success) {
        toast.success("✅ Loan request submitted successfully!");
        setShowBorrowModal(false);
        setBorrowAmount("");
        fetchLoanHistory();
      } else {
        toast.error(data.message || "Failed to submit loan request");
      }
    } catch (error) {
      console.error("Error submitting loan:", error);
      toast.error(error.message || "Failed to submit loan request");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: {
        bg: isLight ? "rgba(217,119,6,0.15)" : "rgba(234, 179, 8, 0.2)",
        color: warningColor,
        label: "Pending",
      },
      approved: {
        bg: isLight ? "rgba(5,150,105,0.15)" : "rgba(16, 185, 129, 0.2)",
        color: creditColor,
        label: "Approved",
      },
      rejected: {
        bg: isLight ? "rgba(220,38,38,0.15)" : "rgba(239, 68, 68, 0.2)",
        color: debitColor,
        label: "Rejected",
      },
      active: {
        bg: isLight ? "rgba(37,99,235,0.15)" : "rgba(59, 130, 246, 0.2)",
        color: infoColor,
        label: "Active",
      },
      completed: {
        bg: isLight ? "rgba(5,150,105,0.15)" : "rgba(16, 185, 129, 0.2)",
        color: creditColor,
        label: "Completed",
      },
      defaulted: {
        bg: isLight ? "rgba(220,38,38,0.15)" : "rgba(239, 68, 68, 0.2)",
        color: debitColor,
        label: "Defaulted",
      },
    };

    const style = statusMap[status] || statusMap.pending;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.color}33`,
        }}
      >
        {style.label}
      </span>
    );
  };

  const openPaymentModal = (loan) => {
    const totalPaid = parseFloat(loan.total_paid) || 0;
    const remaining = parseFloat(loan.total_payable) - totalPaid;
    if (remaining <= 0) {
      toast("This loan is already fully paid!", { icon: "ℹ️" });
      return;
    }
    setSelectedLoan(loan);
    setPaymentAmount("");
    setShowPaymentModal(true);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLoans = loans.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(loans.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: textColor,
          backgroundColor: pageBg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: `4px solid ${fieldBorder}`,
            borderTopColor: accentColor,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="brw-wrap"
      style={{
        padding: "24px",
        color: textColor,
        backgroundColor: pageBg,
        minHeight: "100vh",
      }}
    >
      {/* ============================================================ */}
      {/* 🆕 THEME-AWARE STYLES */}
      {/* ============================================================ */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .brw-wrap { color: ${textColor}; color-scheme: ${isLight ? "light" : "dark"}; }
        .brw-wrap * { box-sizing: border-box; }

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
          color: ${textMuted}; cursor: pointer;
          padding: 4px; font-size: 24px; line-height: 1;
          transition: color 0.2s;
        }
        .modal-close:hover { color: ${modalText}; }

        /* ===== FORM ===== */
        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 14px; font-weight: 500;
          color: ${modalText}; margin-bottom: 6px;
        }
        .form-input {
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
        .form-input:focus {
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
        .form-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover,
        .form-input:-webkit-autofill:focus {
          -webkit-text-fill-color: ${fieldText} !important;
          -webkit-box-shadow: 0 0 0 1000px ${fieldBg} inset !important;
          box-shadow: 0 0 0 1000px ${fieldBg} inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .form-input::selection { background: ${accentColor}; color: #ffffff; }
        .form-input[type="number"]::-webkit-outer-spin-button,
        .form-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        .form-input[type="number"] { -moz-appearance: textfield; }

        /* ===== BUTTONS ===== */
        .btn-primary {
          padding: 10px 24px;
          border-radius: 8px;
          border: none;
          background: #00aa69;
          color: #ffffff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) { background: #008854; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-secondary {
          padding: 10px 24px;
          border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background: transparent;
          color: ${modalText};
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-secondary:hover { background: ${cardSurface2}; }

        .btn-pay {
          padding: 6px 16px;
          border-radius: 6px;
          border: none;
          background: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16, 185, 129, 0.15)"};
          color: ${creditColor};
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
          margin-right: 4px;
        }
        .btn-pay:hover {
          background: ${isLight ? "rgba(5,150,105,0.22)" : "rgba(16, 185, 129, 0.25)"};
        }

        .btn-borrow {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          background: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16, 185, 129, 0.15)"};
          color: ${creditColor};
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-borrow:hover:not(:disabled) {
          background: ${isLight ? "rgba(5,150,105,0.22)" : "rgba(16, 185, 129, 0.25)"};
        }
        .btn-borrow:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-refresh {
          padding: 12px 24px;
          border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background: transparent;
          color: ${textMuted};
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-refresh:hover:not(:disabled) {
          background: ${cardSurface2};
          color: ${textColor};
        }
        .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-refresh .spinning { animation: spin 1s linear infinite; display: inline-block; }

        .page-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid ${fieldBorder};
          background: transparent;
          color: ${textMuted};
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled):not(.active) {
          background-color: ${cardSurface2};
          color: ${textColor};
        }
        .page-btn.active {
          background-color: #00aa69;
          border-color: #00aa69;
          color: #ffffff;
        }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* ===== CARDS ===== */
        .summary-card {
          background: ${cardSurface};
          border-radius: 12px;
          padding: 16px;
          border: 1px solid ${cardBorder};
        }
        .summary-label {
          font-size: 12px;
          color: ${textMuted};
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .summary-value {
          font-size: 20px;
          font-weight: bold;
          color: ${textColor};
          margin-top: 4px;
        }

        .eligibility-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .eligible {
          background: ${isLight ? "rgba(5,150,105,0.15)" : "rgba(16, 185, 129, 0.2)"};
          color: ${creditColor};
          border: 1px solid ${isLight ? "rgba(5,150,105,0.3)" : "rgba(16, 185, 129, 0.3)"};
        }
        .not-eligible {
          background: ${isLight ? "rgba(220,38,38,0.12)" : "rgba(239, 68, 68, 0.2)"};
          color: ${debitColor};
          border: 1px solid ${isLight ? "rgba(220,38,38,0.3)" : "rgba(239, 68, 68, 0.3)"};
        }

        .loan-detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid ${rowBorder};
        }
        .loan-detail-label {
          color: ${textMuted};
          font-size: 14px;
        }
        .loan-detail-value {
          color: ${textColor};
          font-weight: 500;
          font-size: 14px;
        }
        .total-payable-highlight {
          background: ${isLight ? "rgba(5,150,105,0.08)" : "rgba(16, 185, 129, 0.1)"};
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 4px;
          border: 1px solid ${isLight ? "rgba(5,150,105,0.2)" : "rgba(16, 185, 129, 0.2)"};
        }
        .total-payable-highlight .loan-detail-label {
          font-weight: 600;
          color: ${creditColor};
        }
        .total-payable-highlight .loan-detail-value {
          font-weight: 700;
          font-size: 16px;
          color: ${creditColor};
        }

        .max-borrow-info {
          background: ${isLight ? "rgba(5,150,105,0.08)" : "rgba(16, 185, 129, 0.1)"};
          border: 1px solid ${isLight ? "rgba(5,150,105,0.2)" : "rgba(16, 185, 129, 0.2)"};
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .max-borrow-info p {
          margin: 0;
          font-size: 13px;
          color: ${creditColor};
        }
        .max-borrow-info strong {
          color: ${textColor};
        }

        .remaining-balance {
          color: ${creditColor};
          font-weight: 600;
        }

        .payment-info {
          background: ${isLight ? "rgba(37,99,235,0.06)" : "rgba(59, 130, 246, 0.1)"};
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid ${isLight ? "rgba(37,99,235,0.2)" : "rgba(59, 130, 246, 0.2)"};
        }
        .payment-info p {
          margin: 4px 0;
          font-size: 13px;
          color: ${textMuted};
        }
        .payment-info strong {
          color: ${textColor};
        }

        .currency-amount { font-variant-numeric: tabular-nums; }

        /* ===== COMPLETED ROW ===== */
        .loan-row-completed {
          background-color: ${isLight ? "rgba(5,150,105,0.06)" : "rgba(16, 185, 129, 0.08)"} !important;
          border-left: 3px solid ${creditColor} !important;
          transition: background-color 0.3s ease;
        }
        .loan-row-completed:hover {
          background-color: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16, 185, 129, 0.15)"} !important;
        }
        .loan-row-completed td:first-child {
          border-left: 3px solid ${creditColor};
        }
        .loan-row-completed .remaining-balance {
          color: ${creditColor} !important;
        }
        .loan-row-completed .badge {
          background-color: ${isLight ? "rgba(5,150,105,0.15)" : "rgba(16, 185, 129, 0.2)"} !important;
          color: ${creditColor} !important;
          border-color: ${isLight ? "rgba(5,150,105,0.3)" : "rgba(16, 185, 129, 0.3)"} !important;
        }
        .loan-row-completed .btn-pay {
          display: none !important;
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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              margin: 0,
              color: textColor,
            }}
          >
            💰 Loan Management
          </h2>
          <p style={{ color: textMuted, margin: "4px 0 0 0" }}>
            Request and manage your loans
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <span className={refreshing ? "spinning" : ""}>🔄</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="btn-borrow"
            onClick={() => setShowBorrowModal(true)}
            disabled={!loanSettings.enable_loan_requests}
          >
            ➕ Request Loan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="summary-card">
          <div className="summary-label">Total Savings</div>
          <div className="summary-value">
            {formatCurrency(loanDetails.savings)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Maximum Borrow (50%)</div>
          <div className="summary-value" style={{ color: creditColor }}>
            {formatCurrency(loanDetails.savings * 0.5)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Interest Rate</div>
          <div
            className="summary-value"
            style={{ color: warningColor, fontSize: "18px" }}
          >
            {loanSettings.interest_rate || 0}%
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Eligibility Status</div>
          <div style={{ marginTop: "4px" }}>
            <span
              className={`eligibility-badge ${loanDetails.isEligible ? "eligible" : "not-eligible"}`}
            >
              {loanDetails.isEligible ? "✅ Eligible" : "❌ Not Eligible"}
            </span>
            {!loanDetails.isEligible && (
              <div
                style={{
                  fontSize: "11px",
                  color: debitColor,
                  marginTop: "4px",
                }}
              >
                Need {loanSettings.min_membership_days || 180} days
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loan History Table */}
      <div
        style={{
          backgroundColor: cardBg,
          borderRadius: "12px",
          border: `1px solid ${cardBorder}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${cardBorder}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", color: textColor }}>
            📋 Loan History
          </h3>
          <span style={{ fontSize: "13px", color: textMuted }}>
            {loans.length} loan{loans.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: tableHeaderBg }}>
              <tr>
                {[
                  "Loan ID",
                  "Amount",
                  "Total Payable",
                  "Paid",
                  "Remaining",
                  "Status",
                  "Date",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentLoans.map((loan) => {
                const totalPaid = parseFloat(loan.total_paid) || 0;
                const totalPayable = parseFloat(loan.total_payable) || 0;
                const amount = parseFloat(loan.amount) || 0;
                const remaining = totalPayable - totalPaid;
                const isFullyPaid = remaining <= 0.01;
                const canPay =
                  loan.status === "approved" || loan.status === "active";
                const isCompleted = loan.status === "completed" || isFullyPaid;

                return (
                  <tr
                    key={loan.id}
                    className={isCompleted ? "loan-row-completed" : ""}
                    style={{
                      borderTop: `1px solid ${rowBorder}`,
                      transition: "background-color 0.3s ease",
                      ...(isCompleted
                        ? {
                            backgroundColor: isLight
                              ? "rgba(5,150,105,0.06)"
                              : "rgba(16, 185, 129, 0.08)",
                          }
                        : {}),
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        color: isCompleted ? creditColor : infoColor,
                        fontFamily: "monospace",
                        fontSize: "14px",
                      }}
                    >
                      {loan.id}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: creditColor,
                        fontWeight: "500",
                      }}
                    >
                      {formatCurrency(amount)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: isCompleted ? textMuted : textColor,
                        fontWeight: "500",
                      }}
                    >
                      {formatCurrency(totalPayable)}
                    </td>
                    <td style={{ padding: "12px 16px", color: infoColor }}>
                      {formatCurrency(totalPaid)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="remaining-balance">
                        {formatCurrency(remaining)}
                      </span>
                      {isFullyPaid && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "11px",
                            color: creditColor,
                          }}
                        >
                          ✅ Paid
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {getStatusBadge(loan.status)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: textMuted,
                        fontSize: "13px",
                      }}
                    >
                      {new Date(loan.request_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {canPay && !isFullyPaid && (
                        <button
                          className="btn-pay"
                          onClick={() => openPaymentModal(loan)}
                        >
                          💳 Pay
                        </button>
                      )}
                      {isFullyPaid && (
                        <span style={{ fontSize: "12px", color: creditColor }}>
                          ✅ Completed
                        </span>
                      )}
                      {!canPay && !isFullyPaid && loan.status === "pending" && (
                        <span style={{ fontSize: "12px", color: warningColor }}>
                          ⏳ Pending
                        </span>
                      )}
                      {!canPay &&
                        !isFullyPaid &&
                        loan.status === "rejected" && (
                          <span style={{ fontSize: "12px", color: debitColor }}>
                            ❌ Rejected
                          </span>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {loans.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              borderTop: `1px solid ${cardBorder}`,
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "14px", color: textMuted }}>
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, loans.length)} of{" "}
              <span style={{ fontWeight: "600", color: textColor }}>
                {loans.length}
              </span>{" "}
              loans
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                className="page-btn"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                ◀
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNumber}
                    className={`page-btn ${
                      currentPage === pageNumber ? "active" : ""
                    }`}
                    onClick={() => paginate(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                className="page-btn"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Borrow Modal */}
      {showBorrowModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💰 Request Loan</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowBorrowModal(false);
                  setBorrowAmount("");
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBorrowRequest}>
              {/* Eligibility Status */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  backgroundColor: loanDetails.isEligible
                    ? isLight
                      ? "rgba(5,150,105,0.08)"
                      : "rgba(16, 185, 129, 0.1)"
                    : isLight
                      ? "rgba(220,38,38,0.06)"
                      : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${
                    loanDetails.isEligible
                      ? isLight
                        ? "rgba(5,150,105,0.3)"
                        : "rgba(16, 185, 129, 0.3)"
                      : isLight
                        ? "rgba(220,38,38,0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                  }`,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "20px" }}>
                    {loanDetails.isEligible ? "✅" : "❌"}
                  </span>
                  <div>
                    <div
                      style={{
                        color: modalText,
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      {loanDetails.isEligible
                        ? "You are eligible to borrow!"
                        : "You are not eligible to borrow yet"}
                    </div>
                    <div style={{ color: textMuted, fontSize: "12px" }}>
                      {loanDetails.isEligible
                        ? `You have been active for ${Math.floor(loanDetails.membershipDays / 30)} months`
                        : `Need to be active for ${Math.ceil((loanSettings.min_membership_days || 180) / 30)} months (${Math.floor(loanDetails.membershipDays / 30)}/${Math.ceil((loanSettings.min_membership_days || 180) / 30)} months)`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Max Borrow Info */}
              <div className="max-borrow-info">
                <p>
                  💰 You can borrow up to <strong>50%</strong> of your savings
                  balance
                </p>
                <p style={{ marginTop: "4px", color: creditColor }}>
                  Maximum:{" "}
                  <strong>{formatCurrency(loanDetails.savings * 0.5)}</strong>
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Savings Balance</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatCurrency(loanDetails.savings)}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Amount to Borrow *
                  <span
                    style={{
                      color: textMuted,
                      fontSize: "12px",
                      marginLeft: "8px",
                    }}
                  >
                    (Max: 50% of savings)
                  </span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  required
                  placeholder="Enter amount"
                  min="1"
                  max={loanDetails.savings * 0.5}
                  disabled={!loanDetails.isEligible}
                />
                {borrowAmount && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: textMuted,
                      marginTop: "4px",
                    }}
                  >
                    Maximum allowed (50%):{" "}
                    {formatCurrency(loanDetails.savings * 0.5)}
                  </div>
                )}
              </div>

              {/* Loan Breakdown */}
              {borrowAmount && parseFloat(borrowAmount) > 0 && (
                <div
                  style={{
                    backgroundColor: cardSurface,
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      color: modalText,
                      fontWeight: "500",
                      marginBottom: "12px",
                    }}
                  >
                    Loan Breakdown
                  </div>
                  <div className="loan-detail-row">
                    <span className="loan-detail-label">Principal Amount</span>
                    <span className="loan-detail-value">
                      {formatCurrency(loanDetails.amount)}
                    </span>
                  </div>
                  <div className="loan-detail-row">
                    <span className="loan-detail-label">
                      Interest ({loanSettings.interest_rate || 0}%)
                    </span>
                    <span
                      className="loan-detail-value"
                      style={{ color: warningColor }}
                    >
                      {formatCurrency(loanDetails.interest)}
                    </span>
                  </div>
                  <div className="loan-detail-row">
                    <span className="loan-detail-label">Total Payable</span>
                    <span
                      className="loan-detail-value"
                      style={{ color: creditColor }}
                    >
                      {formatCurrency(loanDetails.totalPayable)}
                    </span>
                  </div>
                  <div
                    className="loan-detail-row"
                    style={{ borderBottom: "none" }}
                  >
                    <span className="loan-detail-label">
                      Monthly Payment ({loanDetails.durationMonths} month
                      {loanDetails.durationMonths !== 1 ? "s" : ""})
                    </span>
                    <span
                      className="loan-detail-value"
                      style={{ color: infoColor }}
                    >
                      {formatCurrency(loanDetails.monthlyPayment)}
                    </span>
                  </div>

                  <div className="total-payable-highlight">
                    <div
                      className="loan-detail-row"
                      style={{ borderBottom: "none", padding: "4px 0" }}
                    >
                      <span className="loan-detail-label">
                        💰 Total Amount Payable Over{" "}
                        {loanDetails.durationMonths} Months
                      </span>
                      <span
                        className="loan-detail-value"
                        style={{ fontSize: "18px" }}
                      >
                        {formatCurrency(loanDetails.totalPayable)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: textMuted,
                        marginTop: "4px",
                      }}
                    >
                      This is the total amount you will pay back over{" "}
                      {loanDetails.durationMonths} months
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowBorrowModal(false);
                    setBorrowAmount("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    !loanDetails.isEligible ||
                    !borrowAmount ||
                    parseFloat(borrowAmount) <= 0 ||
                    parseFloat(borrowAmount) > loanDetails.savings * 0.5 ||
                    !loanSettings.enable_loan_requests
                  }
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💳 Make Payment</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedLoan(null);
                  setPaymentAmount("");
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayment}>
              <div className="payment-info">
                <p>
                  Loan ID: <strong>{selectedLoan.id}</strong>
                </p>
                <p>
                  Total Payable:{" "}
                  <strong>{formatCurrency(selectedLoan.total_payable)}</strong>
                </p>
                <p>
                  Total Paid:{" "}
                  <strong style={{ color: infoColor }}>
                    {formatCurrency(selectedLoan.total_paid || 0)}
                  </strong>
                </p>
                <p>
                  Remaining Balance:{" "}
                  <strong style={{ color: creditColor }}>
                    {formatCurrency(
                      parseFloat(selectedLoan.total_payable) -
                        parseFloat(selectedLoan.total_paid || 0),
                    )}
                  </strong>
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount to pay"
                  min="1"
                  max={
                    parseFloat(selectedLoan.total_payable) -
                    parseFloat(selectedLoan.total_paid || 0)
                  }
                  step="0.01"
                />
                <div
                  style={{
                    fontSize: "12px",
                    color: textMuted,
                    marginTop: "4px",
                  }}
                >
                  Maximum:{" "}
                  {formatCurrency(
                    parseFloat(selectedLoan.total_payable) -
                      parseFloat(selectedLoan.total_paid || 0),
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedLoan(null);
                    setPaymentAmount("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    !paymentAmount ||
                    parseFloat(paymentAmount) <= 0 ||
                    parseFloat(paymentAmount) >
                      parseFloat(selectedLoan.total_payable) -
                        parseFloat(selectedLoan.total_paid || 0)
                  }
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Borrowing;
