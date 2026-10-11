// src/components/admin/AdminReports.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";

const API_BASE_URL = "http://localhost:8000";

const AdminReports = () => {
  const { activeBranch, activeBranchId } = useBranch();

  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("all");
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [reportData, setReportData] = useState({
    overview: {
      total_sales: 0,
      total_deposits: 0,
      total_withdrawals: 0,
      total_transfers: 0,
      total_members: 0,
      active_members: 0,
      pending_approvals: 0,
      total_fees: 0,
      average_daily: 0,
    },
    monthly: [],
    members: [],
    transactions: [],
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]); // 🆕 refetch when branch changes

  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, dateRange, startDate, endDate, selectedReportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const membersResponse = await apiFetch("/api/members.php");
      const membersData = await membersResponse.json();
      const membersList = membersData.members || [];
      setMembers(membersList);

      const transactionsResponse = await apiFetch("/api/transactions.php");
      const transactionsData = await transactionsResponse.json();
      const transactionsList = transactionsData.transactions || [];
      setTransactions(transactionsList);

      const pending = transactionsList.filter((t) => t.status === "pending");
      setPendingRequests(pending);

      const totalDeposits = transactionsList
        .filter((t) => t.type === "deposit" && t.status === "approved")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWithdrawals = transactionsList
        .filter((t) => t.type === "withdrawal" && t.status === "approved")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalTransfers = transactionsList
        .filter((t) => t.type === "transfer" && t.status === "approved")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalSales = totalDeposits + totalTransfers;

      const activeMembers = membersList.filter(
        (m) => m.status === "Active",
      ).length;

      const monthlyData = calculateMonthlyData(transactionsList);

      setReportData({
        overview: {
          total_sales: totalSales,
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          total_transfers: totalTransfers,
          total_members: membersList.length,
          active_members: activeMembers,
          pending_approvals: pending.length,
          total_fees: 0,
          average_daily: transactionsList.length > 0 ? totalSales / 30 : 0,
        },
        monthly: monthlyData,
        members: membersList,
        transactions: transactionsList,
      });

      applyFiltersWithData(transactionsList, membersList);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    applyFiltersWithData(transactions, members);
  };

  const applyFiltersWithData = (transactionsList, membersList) => {
    let filtered = [...transactionsList];
    const now = new Date();

    if (dateRange !== "custom") {
      const start = new Date();
      const end = new Date();

      switch (dateRange) {
        case "today":
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case "this_week": {
          const dayOfWeek = start.getDay();
          const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          start.setDate(diff);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        }
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case "last_month":
          start.setMonth(now.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth());
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        case "this_quarter": {
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          start.setMonth(quarterMonth);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(quarterMonth + 3);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          break;
        }
        case "this_year":
          start.setMonth(0);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(11);
          end.setDate(31);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          break;
      }

      filtered = filtered.filter((t) => {
        if (!t.date) return false;
        const transactionDate = new Date(t.date);
        return transactionDate >= start && transactionDate <= end;
      });
    } else {
      let start = null;
      let end = null;

      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      filtered = filtered.filter((t) => {
        if (!t.date) return false;
        const transactionDate = new Date(t.date);
        let valid = true;
        if (start) valid = valid && transactionDate >= start;
        if (end) valid = valid && transactionDate <= end;
        return valid;
      });
    }

    if (selectedReportType !== "all") {
      filtered = filtered.filter((t) => t.type === selectedReportType);
    }

    setFilteredTransactions(filtered);

    const memberIds = new Set(filtered.map((t) => t.memberId));
    const filteredMembersList = membersList.filter(
      (m) => memberIds.has(m.id) || filtered.length === 0,
    );
    setFilteredMembers(filteredMembersList);

    const totalDeposits = filtered
      .filter((t) => t.type === "deposit" && t.status === "approved")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = filtered
      .filter((t) => t.type === "withdrawal" && t.status === "approved")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalTransfers = filtered
      .filter((t) => t.type === "transfer" && t.status === "approved")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSales = totalDeposits + totalTransfers;

    setReportData((prev) => ({
      ...prev,
      overview: {
        ...prev.overview,
        total_sales: totalSales,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_transfers: totalTransfers,
        pending_approvals: filtered.filter((t) => t.status === "pending")
          .length,
        average_daily: filtered.length > 0 ? totalSales / 30 : 0,
      },
    }));

    const formattedMembers = filteredMembersList.map((m) => ({
      id: m.id,
      name: m.name || "Unknown",
      email: m.email || "N/A",
      joined: m.joinDate || m.join_date || "N/A",
      contributions: filtered.filter(
        (t) => t.memberId === m.id && t.status === "approved",
      ).length,
      total: filtered
        .filter(
          (t) =>
            t.memberId === m.id &&
            t.status === "approved" &&
            (t.type === "deposit" || t.type === "transfer"),
        )
        .reduce((sum, t) => sum + t.amount, 0),
    }));

    setReportData((prev) => ({
      ...prev,
      members: formattedMembers.sort((a, b) => b.total - a.total).slice(0, 10),
      transactions: filtered.slice(0, 50).map((t) => ({
        id: t.id,
        type: t.type || "unknown",
        amount: t.amount || 0,
        customer: t.memberName || "Unknown",
        date: t.date || new Date().toISOString(),
        status: t.status || "pending",
      })),
    }));
  };

  const calculateMonthlyData = (transactionsList) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyData = months.map((month) => ({
      month,
      sales: 0,
      deposits: 0,
      withdrawals: 0,
      transfers: 0,
    }));

    const dataToUse =
      filteredTransactions.length > 0 ? filteredTransactions : transactionsList;

    dataToUse.forEach((t) => {
      if (t.date && t.status === "approved") {
        const date = new Date(t.date);
        const monthIndex = date.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          const amount = t.amount || 0;
          monthlyData[monthIndex].sales += amount;
          if (t.type === "deposit") monthlyData[monthIndex].deposits += amount;
          else if (t.type === "withdrawal")
            monthlyData[monthIndex].withdrawals += amount;
          else if (t.type === "transfer")
            monthlyData[monthIndex].transfers += amount;
        }
      }
    });

    return monthlyData;
  };

  const formatNaira = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("NGN", "₦");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getTypeColors = (type) => {
    const map = {
      deposit: { bg: "var(--approved-bg)", color: "var(--badge-text)" },
      withdrawal: { bg: "var(--rejected-bg)", color: "var(--badge-text)" },
      transfer: { bg: "var(--accent-bg)", color: "var(--badge-text)" },
      contribution: { bg: "var(--accent-bg)", color: "var(--badge-text)" },
    };
    return map[type] || { bg: "var(--bg-surface-3)", color: "var(--text)" };
  };

  const getStatusColors = (status) => {
    const map = {
      completed: { bg: "var(--approved-bg)", color: "var(--badge-text)" },
      approved: { bg: "var(--approved-bg)", color: "var(--badge-text)" },
      pending: { bg: "var(--pending-bg)", color: "var(--badge-text)" },
      failed: { bg: "var(--rejected-bg)", color: "var(--badge-text)" },
      rejected: { bg: "var(--rejected-bg)", color: "var(--badge-text)" },
    };
    return map[status] || { bg: "var(--bg-surface-3)", color: "var(--text)" };
  };

  const handleExport = (type) => {
    toast.success(`Exporting ${type} report...`);
  };

  const handlePrint = () => {
    toast.success("Preparing print...");
    window.print();
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range === "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const getCurrentMonthlyData = () => {
    const dataToUse =
      filteredTransactions.length > 0 ? filteredTransactions : transactions;
    return calculateMonthlyData(dataToUse);
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: "var(--text)",
          backgroundColor: "var(--bg-app)",
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
            border: "4px solid var(--border)",
            borderTopColor: "var(--accent)",
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

  const monthlyData = getCurrentMonthlyData();
  const maxMonthlyValue = Math.max(...monthlyData.map((m) => m.sales), 1);

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .reports-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: transparent;
          border: none;
          padding: 4px 0;
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          margin-top: 4px;
        }

        .tabs-container {
          display: flex;
          gap: 8px;
          padding: 0;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 8px 18px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--text);
          background: var(--bg-surface-2);
        }
        .tab-btn.active {
          background: var(--accent);
          color: white;
        }

        .report-card {
          background: transparent;
          border: none;
          padding: 0;
          margin-bottom: 24px;
        }
        .report-card-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--text);
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 200px;
          padding: 0 4px;
        }
        .chart-bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
        }
        .chart-bar {
          width: 100%;
          max-width: 40px;
          border-radius: 4px 4px 0 0;
          min-height: 8px;
          transition: height 0.5s ease;
          position: relative;
        }
        .chart-bar-label {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .chart-bar-value {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .reports-table {
          width: 100%;
          border-collapse: collapse;
          background: transparent;
          border: none;
        }
        .reports-table thead {
          background: transparent;
        }
        .reports-table th {
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          background: transparent;
        }
        .reports-table td {
          padding: 10px 12px;
          border: none;
          font-size: 13px;
          background: transparent;
        }
        .reports-table tbody tr {
          border: none;
          background: transparent;
          transition: background-color 0.15s ease;
        }
        .reports-table tbody tr:hover {
          background-color: var(--bg-surface-2);
        }

        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          border: none;
        }

        .filter-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-select {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .filter-select:focus {
          box-shadow: 0 0 0 2px var(--accent-bg);
        }
        .filter-select option {
          background: var(--bg-surface);
          color: var(--text);
        }
        .date-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 13px;
          outline: none;
          transition: box-shadow 0.2s;
        }
        .date-input:focus {
          box-shadow: 0 0 0 2px var(--accent-bg);
        }

        .btn-export {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: var(--accent);
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-export:hover {
          background: var(--accent-hover);
        }
        .btn-print {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-print:hover {
          background: var(--bg-surface-3);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 13px;
          color: var(--text-muted);
          margin-right: 4px;
        }
        .filter-indicator {
          font-size: 12px;
          color: var(--text-muted);
          padding: 4px 0;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .tabs-container {
            flex-direction: column;
          }
          .tab-btn {
            flex: none;
            min-width: auto;
          }
          .filter-controls {
            flex-direction: column;
          }
          .chart-bars {
            height: 150px;
            gap: 8px;
          }
          .action-buttons {
            flex-direction: column;
          }
          .action-buttons button {
            width: 100%;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .stat-card,
          .report-card {
            background: transparent !important;
            border: none !important;
          }
          .stat-value,
          .report-card-title,
          .reports-table td {
            color: #0f172a !important;
          }
          .stat-label,
          .reports-table th {
            color: #64748b !important;
          }
          .badge {
            color: white !important;
          }
        }
      `}</style>

      <div className="reports-container">
        {/* ===== 🆕 BRANCH BANNER ===== */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "14px 18px",
            marginBottom: "20px",
            borderRadius: "12px",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            background: "rgba(16, 185, 129, 0.06)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "26px" }}>🏢</span>
            <div>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: "15px",
                  fontWeight: "700",
                }}
              >
                {activeBranch?.name || "Branch"}
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  marginTop: "2px",
                }}
              >
                {activeBranch?.code || "—"} · Reports for this branch only ·{" "}
                <strong style={{ color: "var(--credit)" }}>
                  {members.length}
                </strong>{" "}
                members ·{" "}
                <strong style={{ color: "var(--info)" }}>
                  {transactions.length}
                </strong>{" "}
                transactions
              </div>
            </div>
          </div>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: "rgba(16, 185, 129, 0.2)",
              color: "var(--credit)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            ● active branch
          </span>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
              📈 Reports & Analytics
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Analytics for {activeBranch?.name || "your organization"}
            </p>
          </div>
          <div className="action-buttons no-print">
            <button className="btn-print" onClick={handlePrint}>
              🖨️ Print
            </button>
            <button className="btn-export" onClick={() => handleExport("PDF")}>
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-controls no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="filter-label">Date:</span>
            <select
              className="filter-select"
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {dateRange === "custom" && (
            <>
              <input
                type="date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span style={{ color: "var(--text-muted)" }}>to</span>
              <input
                type="date"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="filter-label">Type:</span>
            <select
              className="filter-select"
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
            >
              <option value="all">All Transactions</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>
          <button
            className="btn-print"
            onClick={() => {
              setDateRange("this_month");
              setSelectedReportType("all");
              setStartDate("");
              setEndDate("");
              toast.success("Filters reset");
            }}
          >
            🔄 Reset Filters
          </button>
          <span className="filter-indicator">
            Showing {reportData.transactions.length} transactions in{" "}
            {activeBranch?.name || "this branch"}
          </span>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value" style={{ color: "var(--credit)" }}>
              {formatNaira(reportData.overview.total_sales)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Deposits</div>
            <div className="stat-value" style={{ color: "var(--info)" }}>
              {formatNaira(reportData.overview.total_deposits)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Withdrawals</div>
            <div className="stat-value" style={{ color: "var(--debit)" }}>
              {formatNaira(reportData.overview.total_withdrawals)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Transfers</div>
            <div className="stat-value" style={{ color: "var(--purple)" }}>
              {formatNaira(reportData.overview.total_transfers)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Members</div>
            <div className="stat-value" style={{ color: "var(--text)" }}>
              {reportData.overview.total_members}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Members</div>
            <div className="stat-value" style={{ color: "var(--credit)" }}>
              {reportData.overview.active_members}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value" style={{ color: "var(--warning)" }}>
              {reportData.overview.pending_approvals}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Daily</div>
            <div className="stat-value" style={{ color: "var(--info)" }}>
              {formatNaira(reportData.overview.average_daily)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container no-print">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "monthly" ? "active" : ""}`}
            onClick={() => setActiveTab("monthly")}
          >
            📈 Monthly
          </button>
          <button
            className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            👥 Members
          </button>
          <button
            className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            💳 Transactions
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <div className="report-card">
              <div className="report-card-title">
                📊 Performance Overview — {activeBranch?.name || "Branch"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Total Revenue
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "var(--credit)",
                    }}
                  >
                    {formatNaira(reportData.overview.total_sales)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Total Fees
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "var(--warning)",
                    }}
                  >
                    {formatNaira(reportData.overview.total_fees)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Net Revenue
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "var(--info)",
                    }}
                  >
                    {formatNaira(
                      reportData.overview.total_sales -
                        reportData.overview.total_fees,
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Member Growth
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "var(--purple)",
                    }}
                  >
                    {reportData.overview.active_members > 0
                      ? `+${Math.round(
                          (reportData.overview.active_members /
                            reportData.overview.total_members) *
                            100,
                        )}%`
                      : "0%"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Tab */}
        {activeTab === "monthly" && (
          <div>
            <div className="report-card">
              <div className="report-card-title">
                📈 Monthly Performance — {activeBranch?.name || "Branch"}
              </div>
              <div className="chart-bars">
                {monthlyData.map((month) => {
                  const height =
                    maxMonthlyValue > 0
                      ? (month.sales / maxMonthlyValue) * 100
                      : 0;
                  return (
                    <div key={month.month} className="chart-bar-wrapper">
                      <div className="chart-bar-value">
                        {formatNaira(month.sales)}
                      </div>
                      <div
                        className="chart-bar"
                        style={{
                          height: `${Math.max(height, 8)}%`,
                          background: `linear-gradient(to top, var(--accent), var(--accent-hover))`,
                        }}
                      />
                      <div className="chart-bar-label">{month.month}</div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                  marginTop: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      borderRadius: "2px",
                      background: "var(--accent)",
                    }}
                  ></span>
                  Sales
                </div>
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Showing data for {dateRange.replace(/_/g, " ")}
                {selectedReportType !== "all" &&
                  ` (${selectedReportType}s only)`}
                {" · "}
                {activeBranch?.name || "this branch"}
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div>
            <div className="report-card">
              <div className="report-card-title">
                👥 Top Members — {activeBranch?.name || "Branch"}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Contributions</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.members.length > 0 ? (
                      reportData.members.map((member, index) => (
                        <tr key={member.id}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: "500" }}>{member.name}</td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {member.email}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {formatDate(member.joined)}
                          </td>
                          <td>{member.contributions}</td>
                          <td
                            style={{
                              textAlign: "right",
                              color: "var(--credit)",
                              fontWeight: "600",
                            }}
                          >
                            {formatNaira(member.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          No members found in{" "}
                          {activeBranch?.name || "this branch"} for the selected
                          filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div>
            <div className="report-card">
              <div className="report-card-title">
                💳 Recent Transactions — {activeBranch?.name || "Branch"}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.transactions.length > 0 ? (
                      reportData.transactions.map((transaction) => {
                        const typeColors = getTypeColors(transaction.type);
                        const statusColors = getStatusColors(
                          transaction.status,
                        );
                        return (
                          <tr key={transaction.id}>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: typeColors.bg,
                                  color: typeColors.color,
                                }}
                              >
                                {transaction.type}
                              </span>
                            </td>
                            <td style={{ fontWeight: "500" }}>
                              {transaction.customer}
                            </td>
                            <td
                              style={{
                                color: "var(--credit)",
                                fontWeight: "600",
                              }}
                            >
                              {formatNaira(transaction.amount)}
                            </td>
                            <td style={{ color: "var(--text-muted)" }}>
                              {formatDate(transaction.date)}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: statusColors.bg,
                                  color: statusColors.color,
                                }}
                              >
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          style={{
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          No transactions found in{" "}
                          {activeBranch?.name || "this branch"} for the selected
                          filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
