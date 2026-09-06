// src/components/admin/AdminReports.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("all");
  const [loading, setLoading] = useState(true);

  // State for real data
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

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters whenever transactions, dateRange, or selectedReportType changes
  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters();
    }
  }, [transactions, dateRange, startDate, endDate, selectedReportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch members
      const membersResponse = await fetch(`${API_BASE_URL}/api/members.php`);
      const membersData = await membersResponse.json();
      const membersList = membersData.members || [];
      setMembers(membersList);

      // Fetch transactions
      const transactionsResponse = await fetch(
        `${API_BASE_URL}/api/transactions.php`,
      );
      const transactionsData = await transactionsResponse.json();
      const transactionsList = transactionsData.transactions || [];
      setTransactions(transactionsList);

      // Filter pending transactions
      const pending = transactionsList.filter((t) => t.status === "pending");
      setPendingRequests(pending);

      // Calculate overview stats
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

      // Calculate monthly data
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

      // Initial filter application
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
    // Filter transactions by date range
    let filtered = [...transactionsList];
    const now = new Date();

    console.log("Applying filters - Date Range:", dateRange);
    console.log("Total transactions before filter:", filtered.length);

    if (dateRange !== "custom") {
      const start = new Date();
      const end = new Date();

      switch (dateRange) {
        case "today":
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          console.log("Filter: Today -", start, "to", end);
          break;
        case "this_week":
          // Get start of week (Monday)
          const dayOfWeek = start.getDay();
          const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          start.setDate(diff);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          console.log("Filter: This Week -", start, "to", end);
          break;
        case "this_month":
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          console.log("Filter: This Month -", start, "to", end);
          break;
        case "last_month":
          start.setMonth(now.getMonth() - 1);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(now.getMonth());
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          console.log("Filter: Last Month -", start, "to", end);
          break;
        case "this_quarter":
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          start.setMonth(quarterMonth);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(quarterMonth + 3);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);
          console.log("Filter: This Quarter -", start, "to", end);
          break;
        case "this_year":
          start.setMonth(0);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          end.setMonth(11);
          end.setDate(31);
          end.setHours(23, 59, 59, 999);
          console.log("Filter: This Year -", start, "to", end);
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
      // Custom date range
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

    console.log("Transactions after date filter:", filtered.length);

    // Filter by transaction type
    if (selectedReportType !== "all") {
      filtered = filtered.filter((t) => t.type === selectedReportType);
      console.log("Transactions after type filter:", filtered.length);
    }

    // Store filtered transactions
    setFilteredTransactions(filtered);

    // Filter members based on filtered transactions
    const memberIds = new Set(filtered.map((t) => t.memberId));
    const filteredMembersList = membersList.filter(
      (m) => memberIds.has(m.id) || filtered.length === 0,
    );
    setFilteredMembers(filteredMembersList);

    // Update overview stats with filtered data
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

    // Update overview stats
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

    // Update members list with filtered data
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

    // Use filtered transactions if available, otherwise use all
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

  const getTypeBadge = (type) => {
    const styles = {
      deposit: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      withdrawal: "bg-red-100 text-red-800 border border-red-200",
      transfer: "bg-blue-100 text-blue-800 border border-blue-200",
      contribution: "bg-purple-100 text-purple-800 border border-purple-200",
    };
    return styles[type] || "bg-gray-100 text-gray-800 border border-gray-200";
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-green-100 text-green-800 border border-green-200",
      approved: "bg-green-100 text-green-800 border border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      failed: "bg-red-100 text-red-800 border border-red-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
    };
    return styles[status] || "bg-gray-100 text-gray-800 border border-gray-200";
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

  // Get current monthly data based on filters
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

  const monthlyData = getCurrentMonthlyData();
  const maxMonthlyValue = Math.max(...monthlyData.map((m) => m.sales), 1);

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
        .reports-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          background-color: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px;
        }
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          margin-top: 4px;
        }
        .tabs-container {
          display: flex;
          gap: 4px;
          background-color: rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          flex: 1;
          min-width: 100px;
        }
        .tab-btn:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }
        .tab-btn.active {
          background: #00aa69;
          color: white;
        }
        .report-card {
          background-color: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .report-card-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
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
          color: #94a3b8;
          margin-top: 6px;
        }
        .chart-bar-value {
          font-size: 10px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .reports-table {
          width: 100%;
          border-collapse: collapse;
        }
        .reports-table th {
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .reports-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 13px;
        }
        .reports-table tr:hover {
          background-color: rgba(255,255,255,0.02);
        }
        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
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
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .filter-select:focus {
          border-color: #00aa69;
        }
        .filter-select option {
          background: #1e293b;
          color: white;
        }
        .date-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .date-input:focus {
          border-color: #00aa69;
        }
        .btn-export {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: #00aa69;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-export:hover {
          background: #008854;
        }
        .btn-print {
          padding: 8px 20px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-print:hover {
          background: rgba(255,255,255,0.05);
        }
        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 13px;
          color: #94a3b8;
          margin-right: 4px;
        }
        .filter-indicator {
          font-size: 12px;
          color: #94a3b8;
          padding: 4px 12px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.05);
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
          .stat-card {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          .stat-label {
            color: #64748b !important;
          }
          .stat-value {
            color: #0f172a !important;
          }
          .report-card {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          .report-card-title {
            color: #0f172a !important;
          }
          .reports-table th {
            color: #64748b !important;
          }
          .reports-table td {
            color: #0f172a !important;
          }
          .badge {
            color: white !important;
          }
        }
      `}</style>

      <div className="reports-container">
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
            <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
              View analytics and reports for your organization
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
              <span style={{ color: "#94a3b8" }}>to</span>
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
            className="btn-export"
            onClick={() => {
              setDateRange("this_month");
              setSelectedReportType("all");
              setStartDate("");
              setEndDate("");
              toast.success("Filters reset");
            }}
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            🔄 Reset Filters
          </button>
          <span className="filter-indicator">
            Showing {reportData.transactions.length} transactions
          </span>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value" style={{ color: "#34d399" }}>
              {formatNaira(reportData.overview.total_sales)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Deposits</div>
            <div className="stat-value" style={{ color: "#60a5fa" }}>
              {formatNaira(reportData.overview.total_deposits)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Withdrawals</div>
            <div className="stat-value" style={{ color: "#f87171" }}>
              {formatNaira(reportData.overview.total_withdrawals)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Transfers</div>
            <div className="stat-value" style={{ color: "#a78bfa" }}>
              {formatNaira(reportData.overview.total_transfers)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Members</div>
            <div className="stat-value" style={{ color: "white" }}>
              {reportData.overview.total_members}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Members</div>
            <div className="stat-value" style={{ color: "#34d399" }}>
              {reportData.overview.active_members}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value" style={{ color: "#fbbf24" }}>
              {reportData.overview.pending_approvals}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Daily</div>
            <div className="stat-value" style={{ color: "#60a5fa" }}>
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
              <div className="report-card-title">📊 Performance Overview</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Total Revenue
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#34d399",
                    }}
                  >
                    {formatNaira(reportData.overview.total_sales)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Total Fees
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#fbbf24",
                    }}
                  >
                    {formatNaira(reportData.overview.total_fees)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Net Revenue
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#60a5fa",
                    }}
                  >
                    {formatNaira(
                      reportData.overview.total_sales -
                        reportData.overview.total_fees,
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Member Growth
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#a78bfa",
                    }}
                  >
                    {reportData.overview.active_members > 0
                      ? `+${Math.round((reportData.overview.active_members / reportData.overview.total_members) * 100)}%`
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
              <div className="report-card-title">📈 Monthly Performance</div>
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
                          background: `linear-gradient(to top, #34d399, #34d399dd)`,
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
                    color: "#94a3b8",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      borderRadius: "2px",
                      background: "#34d399",
                    }}
                  ></span>
                  Sales
                </div>
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                Showing data for {dateRange.replace(/_/g, " ")}
                {selectedReportType !== "all" &&
                  ` (${selectedReportType}s only)`}
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div>
            <div className="report-card">
              <div className="report-card-title">👥 Top Members</div>
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
                          <td style={{ color: "#94a3b8" }}>{member.email}</td>
                          <td style={{ color: "#94a3b8" }}>
                            {formatDate(member.joined)}
                          </td>
                          <td>{member.contributions}</td>
                          <td
                            style={{
                              textAlign: "right",
                              color: "#34d399",
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
                          style={{ textAlign: "center", color: "#94a3b8" }}
                        >
                          No members found for the selected filters
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
              <div className="report-card-title">💳 Recent Transactions</div>
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
                      reportData.transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <span
                              className={`badge ${getTypeBadge(transaction.type)}`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: "500" }}>
                            {transaction.customer}
                          </td>
                          <td style={{ color: "#34d399", fontWeight: "600" }}>
                            {formatNaira(transaction.amount)}
                          </td>
                          <td style={{ color: "#94a3b8" }}>
                            {formatDate(transaction.date)}
                          </td>
                          <td>
                            <span
                              className={`badge ${getStatusBadge(transaction.status)}`}
                            >
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          style={{ textAlign: "center", color: "#94a3b8" }}
                        >
                          No transactions found for the selected filters
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
