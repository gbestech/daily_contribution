// src/components/member/Borrowing.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const Borrowing = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [userData, setUserData] = useState(null);
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

  // Use ref to track if data has been fetched
  const hasFetched = useRef(false);

  // Only fetch data once when component mounts
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAllData();
    }
  }, []);

  // Calculate loan details when amount changes
  useEffect(() => {
    if (borrowAmount && userData) {
      calculateLoanDetails(parseFloat(borrowAmount));
    }
  }, [borrowAmount, userData, loanSettings]);

  // Combined fetch function
  const fetchAllData = async () => {
    // First fetch settings, then use the fetched settings for user data
    const settings = await fetchLoanSettings();
    await fetchUserData(settings);
    await fetchLoanHistory();
  };

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success("Data refreshed successfully!");
  };

  // Fetch loan settings from API - RETURNS the settings
  const fetchLoanSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings.php`);
      if (response.ok) {
        const result = await response.json();
        console.log("Full API response:", result);

        if (result.status === true && result.data && result.data.loan) {
          const settings = result.data.loan;
          console.log("Loan settings from DB:", settings);

          // Use the values from the database
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

          // Update loanDetails with the new settings
          setLoanDetails((prev) => ({
            ...prev,
            durationMonths: settings.max_duration_months || 6,
          }));

          return updatedSettings; // Return the settings for use in fetchUserData
        } else {
          console.warn("No loan settings found in response, using defaults");
          return null;
        }
      } else {
        console.error("Failed to fetch settings, status:", response.status);
        return null;
      }
    } catch (error) {
      console.error("Error fetching loan settings:", error);
      return null;
    }
  };

  // Fetch user data - accepts settings parameter
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

            // Use the fetched settings or fallback to state
            const minDays = fetchedSettings
              ? fetchedSettings.min_membership_days
              : loanSettings.min_membership_days || 180;

            const isEligible = diffDays >= minDays;
            const savings = parseFloat(member.balance || member.savings || 0);
            const maxBorrow = savings * 0.5; // 50% of savings

            console.log("Membership days:", diffDays);
            console.log("Required days (from settings):", minDays);
            console.log("Is eligible:", isEligible);

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
          console.warn("Loans API not found.");
          setLoans([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.warn("API error:", data.error);
        setLoans([]);
        setLoading(false);
        return;
      }

      if (data.loans && Array.isArray(data.loans)) {
        setLoans(data.loans);
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
    const maxBorrow = savings * 0.5; // 50% of savings

    // Use the interest rate from settings - default to 0 if not set
    const interestRate = (loanSettings.interest_rate || 0) / 100;
    const interest = amount * interestRate;
    const totalPayable = amount + interest;
    const durationMonths = loanSettings.max_duration_months || 6;
    const monthlyPayment = totalPayable / durationMonths;

    console.log("Interest rate used:", loanSettings.interest_rate, "%");

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

  const handleBorrowRequest = async (e) => {
    e.preventDefault();

    try {
      const amount = parseFloat(borrowAmount);
      const savings = loanDetails.savings;
      const maxBorrow = savings * 0.5; // 50% of savings

      // Validation
      if (amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Check if amount exceeds 50% of savings
      if (amount > maxBorrow) {
        toast.error(
          `You can only borrow up to 50% of your savings (₦${maxBorrow.toLocaleString()})`,
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

      // Check if loan requests are enabled
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
        bg: "rgba(234, 179, 8, 0.2)",
        color: "#fbbf24",
        label: "Pending",
      },
      approved: {
        bg: "rgba(16, 185, 129, 0.2)",
        color: "#34d399",
        label: "Approved",
      },
      rejected: {
        bg: "rgba(239, 68, 68, 0.2)",
        color: "#f87171",
        label: "Rejected",
      },
      active: {
        bg: "rgba(59, 130, 246, 0.2)",
        color: "#60a5fa",
        label: "Active",
      },
      completed: {
        bg: "rgba(16, 185, 129, 0.2)",
        color: "#34d399",
        label: "Completed",
      },
      defaulted: {
        bg: "rgba(239, 68, 68, 0.2)",
        color: "#f87171",
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

  // Pagination
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
          color: "white",
          backgroundColor: "#0f172a",
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
            border: "4px solid rgba(255,255,255,0.1)",
            borderTopColor: "#00aa69",
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
      style={{
        padding: "24px",
        color: "white",
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
        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-primary {
          padding: 10px 24px;
          border-radius: 8px;
          border: none;
          background: #00aa69;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: #008854;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 10px 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
        }
        .btn-borrow {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-borrow:hover {
          background: rgba(16, 185, 129, 0.25);
        }
        .btn-refresh {
          padding: 12px 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-refresh:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }
        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-refresh .spinning {
          animation: spin 1s linear infinite;
        }
        .page-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background-color: rgba(255,255,255,0.05);
          color: white;
        }
        .page-btn.active {
          background-color: #00aa69;
          border-color: #00aa69;
          color: white;
        }
        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .summary-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .summary-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .summary-value {
          font-size: 20px;
          font-weight: bold;
          color: white;
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
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .not-eligible {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .loan-detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .loan-detail-label {
          color: #94a3b8;
          font-size: 14px;
        }
        .loan-detail-value {
          color: white;
          font-weight: 500;
          font-size: 14px;
        }
        .max-borrow-info {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .max-borrow-info p {
          margin: 0;
          font-size: 13px;
          color: #34d399;
        }
        .max-borrow-info strong {
          color: white;
        }
        .interest-display {
          font-size: 12px;
          color: #94a3b8;
        }
        .interest-display strong {
          color: #fbbf24;
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
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            💰 Loan Management
          </h2>
          <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
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
            ₦{loanDetails.savings.toLocaleString()}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Maximum Borrow (50%)</div>
          <div className="summary-value" style={{ color: "#34d399" }}>
            ₦{(loanDetails.savings * 0.5).toLocaleString()}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Interest Rate</div>
          <div
            className="summary-value"
            style={{ color: "#fbbf24", fontSize: "18px" }}
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
                style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}
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
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", color: "white" }}>
            📋 Loan History
          </h3>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            {loans.length} loan{loans.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <tr>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Loan ID
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Interest
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total Payable
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Monthly Payment
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date Requested
                </th>
              </tr>
            </thead>
            <tbody>
              {currentLoans.length > 0 ? (
                currentLoans.map((loan) => (
                  <tr
                    key={loan.id}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#60a5fa",
                        fontFamily: "monospace",
                        fontSize: "14px",
                      }}
                    >
                      #{loan.id}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#34d399",
                        fontWeight: "500",
                      }}
                    >
                      ₦{parseFloat(loan.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#fbbf24" }}>
                      ₦{parseFloat(loan.interest).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "white",
                        fontWeight: "500",
                      }}
                    >
                      ₦{parseFloat(loan.total_payable).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                      ₦{parseFloat(loan.monthly_payment).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {getStatusBadge(loan.status)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94a3b8",
                        fontSize: "13px",
                      }}
                    >
                      {new Date(loan.request_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ color: "#94a3b8" }}>
                      <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                        📭
                      </div>
                      <p>No loan history found</p>
                      <p style={{ fontSize: "13px", marginTop: "4px" }}>
                        Click the "Request Loan" button to apply for a loan
                      </p>
                    </div>
                  </td>
                </tr>
              )}
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
              borderTop: "1px solid rgba(255,255,255,0.05)",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "14px", color: "#94a3b8" }}>
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, loans.length)} of{" "}
              <span style={{ fontWeight: "600", color: "white" }}>
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
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${loanDetails.isEligible ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
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
                        color: "white",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      {loanDetails.isEligible
                        ? "You are eligible to borrow!"
                        : "You are not eligible to borrow yet"}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
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
                <p style={{ marginTop: "4px", color: "#34d399" }}>
                  Maximum:{" "}
                  <strong>
                    ₦{(loanDetails.savings * 0.5).toLocaleString()}
                  </strong>
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Savings Balance</label>
                <input
                  type="text"
                  className="form-input"
                  value={`₦${loanDetails.savings.toLocaleString()}`}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Amount to Borrow *
                  <span
                    style={{
                      color: "#94a3b8",
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
                      color: "#94a3b8",
                      marginTop: "4px",
                    }}
                  >
                    Maximum allowed (50%): ₦
                    {(loanDetails.savings * 0.5).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Loan Breakdown */}
              {borrowAmount && parseFloat(borrowAmount) > 0 && (
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      color: "white",
                      fontWeight: "500",
                      marginBottom: "12px",
                    }}
                  >
                    Loan Breakdown
                  </div>
                  <div className="loan-detail-row">
                    <span className="loan-detail-label">Principal Amount</span>
                    <span className="loan-detail-value">
                      ₦{loanDetails.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="loan-detail-row">
                    <span className="loan-detail-label">
                      Interest ({loanSettings.interest_rate || 0}%)
                    </span>
                    <span
                      className="loan-detail-value"
                      style={{ color: "#fbbf24" }}
                    >
                      ₦{loanDetails.interest.toLocaleString()}
                    </span>
                  </div>
                  <div className="loan-detail-row">
                    <span className="loan-detail-label">Total Payable</span>
                    <span
                      className="loan-detail-value"
                      style={{ color: "#34d399" }}
                    >
                      ₦{loanDetails.totalPayable.toLocaleString()}
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
                      style={{ color: "#60a5fa" }}
                    >
                      ₦{loanDetails.monthlyPayment.toLocaleString()}
                    </span>
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
    </div>
  );
};

export default Borrowing;
