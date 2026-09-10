import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Stats
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch members
      const membersResponse = await fetch(`${API_BASE_URL}/api/members.php`);
      const membersData = await membersResponse.json();
      if (membersData.members) {
        setMembers(membersData.members);
      }

      // Fetch transactions
      const transactionsResponse = await fetch(
        `${API_BASE_URL}/api/transactions.php`,
      );
      const transactionsData = await transactionsResponse.json();

      let allTransactions = [];
      if (transactionsData.transactions) {
        allTransactions = transactionsData.transactions;
      }

      // If user is a member, filter their transactions
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.role === "member" || userData.role === "user") {
          allTransactions = allTransactions.filter(
            (t) =>
              t.memberId === userData.id ||
              t.memberId === parseInt(userData.id),
          );
        }
      }

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);

      // Calculate stats
      calculateStats(allTransactions);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactions) => {
    const totalDeposits = transactions
      .filter((t) => t.type === "deposit" || t.type === "contribution")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = transactions
      .filter((t) => t.type === "withdrawal")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalTransfers = transactions
      .filter((t) => t.type === "transfer")
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingCount = transactions.filter(
      (t) => t.status === "pending",
    ).length;
    const approvedCount = transactions.filter(
      (t) => t.status === "approved",
    ).length;
    const rejectedCount = transactions.filter(
      (t) => t.status === "rejected",
    ).length;

    setStats({
      totalDeposits,
      totalWithdrawals,
      totalTransfers,
      pendingCount,
      approvedCount,
      rejectedCount,
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get member name by ID
  const getMemberName = (memberId) => {
    if (!memberId) return "Unknown";
    const member = members.find((m) => m.id === parseInt(memberId));
    return member ? member.name : "Unknown";
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.memberName?.toLowerCase().includes(term) ||
          t.accountNumber?.includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.id?.toString().includes(term),
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter((t) => t.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter((t) => t.date <= dateRange.end);
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareA = a[sortBy] || "";
      let compareB = b[sortBy] || "";

      if (sortBy === "amount") {
        compareA = parseFloat(a.amount) || 0;
        compareB = parseFloat(b.amount) || 0;
      } else if (sortBy === "date") {
        compareA = new Date(a.date);
        compareB = new Date(b.date);
      } else if (sortBy === "id") {
        compareA = parseInt(a.id) || 0;
        compareB = parseInt(b.id) || 0;
      } else {
        compareA = String(compareA).toLowerCase();
        compareB = String(compareB).toLowerCase();
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [
    searchTerm,
    filterType,
    filterStatus,
    dateRange,
    sortBy,
    sortOrder,
    transactions,
  ]);

  // Get paginated data
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      pending: {
        backgroundColor: "rgba(234, 179, 8, 0.2)",
        color: "#fbbf24",
      },
      approved: {
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        color: "#34d399",
      },
      rejected: {
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        color: "#f87171",
      },
    };

    const style = styles[status] || styles.pending;
    return (
      <span
        style={{
          padding: "4px 12px",
          fontSize: "12px",
          borderRadius: "20px",
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontWeight: "500",
        }}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  // Get type badge
  const getTypeBadge = (type) => {
    const styles = {
      deposit: {
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        color: "#34d399",
        icon: "💰",
      },
      withdrawal: {
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        color: "#f87171",
        icon: "💸",
      },
      transfer: {
        backgroundColor: "rgba(139, 92, 246, 0.2)",
        color: "#a78bfa",
        icon: "🔄",
      },
      contribution: {
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        color: "#60a5fa",
        icon: "🤝",
      },
    };

    const style = styles[type] || styles.deposit;
    return (
      <span
        style={{
          padding: "4px 12px",
          fontSize: "12px",
          borderRadius: "20px",
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontWeight: "500",
        }}
      >
        {style.icon} {type.toUpperCase()}
      </span>
    );
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatus("all");
    setDateRange({ start: "", end: "" });
    setSortBy("date");
    setSortOrder("desc");
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "white", textAlign: "center" }}>
        <div style={{ fontSize: "20px" }}>⏳ Loading transactions...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        color: "white",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.3s ease;
        }
        .stat-card {
          background-color: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        .table-container {
          overflow-x: auto;
          max-height: 550px;
          overflow-y: auto;
        }
        .table-container::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .table-container::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        .table-container::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        .table-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          padding: 14px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          background-color: rgba(255, 255, 255, 0.08);
          position: sticky;
          top: 0;
          z-index: 10;
          white-space: nowrap;
          cursor: pointer;
          user-select: none;
        }
        th:hover {
          color: white;
        }
        td {
          padding: 14px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        tr {
          transition: background-color 0.2s;
        }
        tr:hover {
          background-color: rgba(255, 255, 255, 0.03);
        }
        .page-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }
        .page-btn:hover {
          background-color: rgba(255,255,255,0.05);
        }
        .page-btn.active {
          background-color: rgba(16, 185, 129, 0.2);
          border-color: #10b981;
          color: #34d399;
        }
        .filter-input {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .filter-input:focus {
          border-color: #10b981;
        }
        .filter-select {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          outline: none;
          font-size: 14px;
          cursor: pointer;
        }
        .filter-select option {
          background-color: #1e293b;
          color: white;
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
            📊 Transaction History
          </h2>
          <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
            {user?.role === "admin"
              ? "All member transactions"
              : "Your transaction history"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchData}
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              padding: "8px 16px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(59, 130, 246, 0.25)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(59, 130, 246, 0.15)")
            }
          >
            🔄 Refresh
          </button>
          <button
            onClick={resetFilters}
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              padding: "8px 16px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "rgba(239, 68, 68, 0.25)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "rgba(239, 68, 68, 0.15)")
            }
          >
            🔄 Reset Filters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="stat-card">
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            💰 Total Deposits
          </p>
          <p
            style={{
              color: "#34d399",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "4px 0 0 0",
            }}
          >
            {formatCurrency(stats.totalDeposits)}
          </p>
        </div>
        <div className="stat-card">
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            💸 Total Withdrawals
          </p>
          <p
            style={{
              color: "#f87171",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "4px 0 0 0",
            }}
          >
            {formatCurrency(stats.totalWithdrawals)}
          </p>
        </div>
        <div className="stat-card">
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            🔄 Total Transfers
          </p>
          <p
            style={{
              color: "#a78bfa",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "4px 0 0 0",
            }}
          >
            {formatCurrency(stats.totalTransfers)}
          </p>
        </div>
        <div className="stat-card">
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            ⏳ Pending
          </p>
          <p
            style={{
              color: "#fbbf24",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "4px 0 0 0",
            }}
          >
            {stats.pendingCount}
          </p>
        </div>
        <div className="stat-card">
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            ✅ Approved
          </p>
          <p
            style={{
              color: "#34d399",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "4px 0 0 0",
            }}
          >
            {stats.approvedCount}
          </p>
        </div>
        <div className="stat-card">
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            ❌ Rejected
          </p>
          <p
            style={{
              color: "#f87171",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "4px 0 0 0",
            }}
          >
            {stats.rejectedCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          <input
            type="text"
            className="filter-input"
            placeholder="🔍 Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">📋 All Types</option>
            <option value="deposit">💰 Deposit</option>
            <option value="withdrawal">💸 Withdrawal</option>
            <option value="transfer">🔄 Transfer</option>
            <option value="contribution">🤝 Contribution</option>
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">📊 All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>

          <input
            type="date"
            className="filter-input"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            placeholder="Start Date"
          />

          <input
            type="date"
            className="filter-input"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            placeholder="End Date"
          />

          <select
            className="filter-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split("-");
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
          >
            <option value="date-desc">📅 Newest First</option>
            <option value="date-asc">📅 Oldest First</option>
            <option value="amount-desc">💰 Highest First</option>
            <option value="amount-asc">💰 Lowest First</option>
            <option value="id-desc">🔢 Newest ID</option>
            <option value="id-asc">🔢 Oldest ID</option>
          </select>
        </div>

        <div style={{ marginTop: "12px", color: "#9ca3af", fontSize: "13px" }}>
          {filteredTransactions.length} transaction(s) found
        </div>
      </div>

      {/* Transactions Table */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
        }}
      >
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>ID</th>
                <th style={{ width: "15%" }}>Member</th>
                <th style={{ width: "12%" }}>Type</th>
                <th style={{ width: "15%" }}>Amount</th>
                <th style={{ width: "15%" }}>Date</th>
                <th style={{ width: "10%" }}>Status</th>
                <th style={{ width: "28%" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedData().length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ color: "#94a3b8" }}>
                      <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                        📭
                      </div>
                      <p>No transactions found</p>
                      <p style={{ fontSize: "13px", marginTop: "4px" }}>
                        {searchTerm ||
                        filterType !== "all" ||
                        filterStatus !== "all"
                          ? "Try adjusting your filters"
                          : "Your transactions will appear here"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                getPaginatedData().map((transaction) => (
                  <tr key={transaction.id} className="fade-in">
                    <td
                      style={{
                        color: "#9ca3af",
                        fontFamily: "monospace",
                        fontSize: "13px",
                      }}
                    >
                      #{transaction.id}
                    </td>
                    <td>
                      <div style={{ color: "white", fontSize: "14px" }}>
                        {transaction.memberName ||
                          getMemberName(transaction.memberId)}
                      </div>
                      {transaction.accountNumber && (
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          Acc: {transaction.accountNumber}
                        </div>
                      )}
                    </td>
                    <td>{getTypeBadge(transaction.type)}</td>
                    <td
                      style={{
                        color:
                          transaction.type === "withdrawal"
                            ? "#f87171"
                            : "#34d399",
                        fontWeight: "600",
                        fontSize: "16px",
                      }}
                    >
                      {transaction.type === "withdrawal" ? "-" : ""}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td style={{ color: "#9ca3af", fontSize: "13px" }}>
                      {formatDate(transaction.date)}
                    </td>
                    <td>{getStatusBadge(transaction.status)}</td>
                    <td style={{ color: "#d1d5db", fontSize: "13px" }}>
                      {transaction.description || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ color: "#9ca3af", fontSize: "13px" }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(
                currentPage * itemsPerPage,
                filteredTransactions.length,
              )}{" "}
              of {filteredTransactions.length}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                className="page-btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  opacity: currentPage === 1 ? 0.3 : 1,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                ←
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="page-btn"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                style={{
                  opacity: currentPage === totalPages ? 0.3 : 1,
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => {
            // Export as CSV
            const headers = [
              "ID",
              "Member",
              "Type",
              "Amount",
              "Date",
              "Status",
              "Description",
            ];
            const rows = filteredTransactions.map((t) => [
              t.id,
              t.memberName || getMemberName(t.memberId),
              t.type,
              t.amount,
              t.date,
              t.status,
              t.description || "",
            ]);

            const csv = [
              headers.join(","),
              ...rows.map((r) => r.join(",")),
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("📥 Transaction history exported!");
          }}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#34d399",
            padding: "8px 16px",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.target.style.backgroundColor = "rgba(16, 185, 129, 0.25)")
          }
          onMouseLeave={(e) =>
            (e.target.style.backgroundColor = "rgba(16, 185, 129, 0.15)")
          }
        >
          📥 Export CSV
        </button>
      </div>
    </div>
  );
};

export default MemberHistory;
