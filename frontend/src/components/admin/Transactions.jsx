// src/components/admin/AdminTransactions.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    total_amount: 0,
    deposits: 0,
    withdrawals: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const result = await response.json();

      // Handle different response formats
      let data = [];
      if (Array.isArray(result)) {
        data = result;
      } else if (result.transactions && Array.isArray(result.transactions)) {
        data = result.transactions;
      } else if (result.data && Array.isArray(result.data)) {
        data = result.data;
      }

      // Format transactions to match the component's expected structure
      const formattedData = data.map((t) => ({
        id: t.id,
        type: t.type || "deposit",
        amount: parseFloat(t.amount) || 0,
        status: t.status || "pending",
        customer_name: t.memberName || t.customer_name || "Unknown",
        customer_phone: t.accountNumber || t.customer_phone || "",
        description: t.description || "",
        reference: t.reference || `TRX-${String(t.id).padStart(6, "0")}`,
        transaction_id: t.id,
        created_at: t.date || t.created_at || new Date().toISOString(),
        payment_method: t.payment_method || "cash",
        invoice_number: t.invoice_number || "",
        receipt_path: t.receipt_path || null,
        memberId: t.memberId,
        accountNumber: t.accountNumber,
        memberName: t.memberName,
      }));

      setTransactions(formattedData);

      // Calculate stats
      const totalAmount = formattedData.reduce(
        (sum, t) => sum + (parseFloat(t.amount) || 0),
        0,
      );
      const deposits = formattedData.filter(
        (t) => t.type === "deposit" || t.type === "credit",
      ).length;
      const withdrawals = formattedData.filter(
        (t) => t.type === "withdrawal" || t.type === "debit",
      ).length;
      const pending = formattedData.filter(
        (t) => t.status === "pending",
      ).length;
      const completed = formattedData.filter(
        (t) => t.status === "completed" || t.status === "approved",
      ).length;

      setStats({
        total: formattedData.length,
        total_amount: totalAmount,
        deposits,
        withdrawals,
        pending,
        completed,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Approve transaction
  const handleApproveTransaction = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        toast.success("✅ Transaction approved!");
        fetchTransactions(); // Refresh the list
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to approve transaction");
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast.error("Failed to approve transaction");
    }
  };

  // Reject transaction
  const handleRejectTransaction = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        toast.success("✅ Transaction rejected!");
        fetchTransactions(); // Refresh the list
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to reject transaction");
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast.error("Failed to reject transaction");
    }
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
      return new Date(dateString).toLocaleString("en-NG", {
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

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: "💰",
      withdrawal: "🏦",
      payment: "💳",
      refund: "↩️",
      fee: "📊",
      transfer: "🔄",
      credit: "📈",
      debit: "📉",
    };
    return icons[type] || "💳";
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-green-100 text-green-800 border border-green-200",
      approved: "bg-green-100 text-green-800 border border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      failed: "bg-red-100 text-red-800 border border-red-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border border-gray-200",
      processing: "bg-blue-100 text-blue-800 border border-blue-200",
    };
    return styles[status] || "bg-gray-100 text-gray-800 border border-gray-200";
  };

  const getTypeBadge = (type) => {
    const styles = {
      deposit: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      withdrawal: "bg-red-100 text-red-800 border border-red-200",
      payment: "bg-blue-100 text-blue-800 border border-blue-200",
      refund: "bg-orange-100 text-orange-800 border border-orange-200",
      fee: "bg-purple-100 text-purple-800 border border-purple-200",
      transfer: "bg-indigo-100 text-indigo-800 border border-indigo-200",
      credit: "bg-green-100 text-green-800 border border-green-200",
      debit: "bg-red-100 text-red-800 border border-red-200",
    };
    return styles[type] || "bg-gray-100 text-gray-800 border border-gray-200";
  };

  const filteredTransactions = () => {
    if (!searchTerm.trim()) return currentTransactions;
    const term = searchTerm.toLowerCase().trim();
    return currentTransactions.filter((t) => {
      return (
        (t.customer_name && t.customer_name.toLowerCase().includes(term)) ||
        (t.customer_phone && t.customer_phone.includes(term)) ||
        (t.reference && t.reference.toLowerCase().includes(term)) ||
        (t.invoice_number && t.invoice_number.toLowerCase().includes(term)) ||
        (t.transaction_id && t.transaction_id.toString().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    });
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = transactions.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
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
        .transaction-table {
          width: 100%;
          border-collapse: collapse;
        }
        .transaction-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .transaction-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .transaction-table tr:hover {
          background-color: rgba(255,255,255,0.02);
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
        }
        .badge-completed {
          background-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-pending {
          background-color: rgba(234, 179, 8, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }
        .badge-failed {
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-approved {
          background-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-rejected {
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-cancelled {
          background-color: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
        .badge-processing {
          background-color: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .type-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
        }
        .type-deposit {
          background-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }
        .type-withdrawal {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }
        .type-payment {
          background-color: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .type-refund {
          background-color: rgba(234, 179, 8, 0.15);
          color: #fbbf24;
        }
        .type-fee {
          background-color: rgba(168, 85, 247, 0.15);
          color: #a78bfa;
        }
        .type-transfer {
          background-color: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }
        .type-credit {
          background-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }
        .type-debit {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
        .search-input {
          width: 100%;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .search-input:focus {
          border-color: #00aa69;
        }
        .search-input::placeholder {
          color: #64748b;
        }
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 4px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pagination-info {
          font-size: 13px;
          color: #94a3b8;
        }
        .pagination-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
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
        .empty-state {
          text-align: center;
          padding: 48px 20px;
          color: #94a3b8;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 8px;
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
          padding: 24px;
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
        .detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 14px;
        }
        .detail-label {
          font-size: 11px;
          color: #94a3b8;
        }
        .detail-value {
          font-weight: 500;
        }
        .btn-close {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.05);
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-close:hover {
          background: rgba(255,255,255,0.1);
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .detail-row {
            grid-template-columns: 1fr;
          }
          .pagination {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>

      <h2
        style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}
      >
        💰 All Transactions
      </h2>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value" style={{ color: "white" }}>
            {stats.total}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value" style={{ color: "#34d399" }}>
            {formatNaira(stats.total_amount)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Deposits</div>
          <div className="stat-value" style={{ color: "#34d399" }}>
            {stats.deposits}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Withdrawals</div>
          <div className="stat-value" style={{ color: "#f87171" }}>
            {stats.withdrawals}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: "#fbbf24" }}>
            {stats.pending}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: "#60a5fa" }}>
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        className="search-input"
        placeholder="Search by customer, phone, reference, invoice..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {searchTerm && (
        <div
          style={{
            fontSize: "13px",
            color: "#94a3b8",
            marginBottom: "12px",
          }}
        >
          Found{" "}
          <span style={{ color: "#34d399", fontWeight: "600" }}>
            {filteredTransactions().length}
          </span>{" "}
          transaction{filteredTransactions().length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Transactions Table */}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions().length > 0 ? (
                filteredTransactions().map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>
                          {getTransactionIcon(t.type)}
                        </span>
                        <span className={`type-badge type-${t.type}`}>
                          {t.type}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "500" }}>
                          {t.customer_name || "Walk-in Customer"}
                        </div>
                        {t.customer_phone && (
                          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {t.customer_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color:
                            t.type === "deposit" || t.type === "credit"
                              ? "#34d399"
                              : "#f87171",
                        }}
                      >
                        {formatNaira(t.amount)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                        {formatDate(t.created_at)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "#60a5fa",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background =
                            "rgba(96, 165, 250, 0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                        onClick={() => viewTransactionDetails(t)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-icon">💳</div>
                      <p style={{ fontSize: "16px", fontWeight: "500" }}>
                        {searchTerm
                          ? "No transactions found"
                          : "No transactions yet"}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {searchTerm
                          ? `No transactions matching "${searchTerm}"`
                          : "Transactions will appear here once recorded"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, transactions.length)} of{" "}
              <span style={{ fontWeight: "600", color: "white" }}>
                {transactions.length}
              </span>{" "}
              entries
            </div>
            <div className="pagination-buttons">
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
                    className={`page-btn ${currentPage === pageNumber ? "active" : ""}`}
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

      {/* Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Transaction Details</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "32px" }}>
                {getTransactionIcon(selectedTransaction.type)}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#34d399",
                  }}
                >
                  {formatNaira(selectedTransaction.amount)}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <span
                    className={`type-badge type-${selectedTransaction.type}`}
                  >
                    {selectedTransaction.type}
                  </span>
                  <span className={`badge badge-${selectedTransaction.status}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-row">
              <div>
                <div className="detail-label">Transaction ID</div>
                <div className="detail-value">#{selectedTransaction.id}</div>
              </div>
              <div>
                <div className="detail-label">Date</div>
                <div className="detail-value">
                  {formatDate(selectedTransaction.created_at)}
                </div>
              </div>
              <div>
                <div className="detail-label">Customer</div>
                <div className="detail-value">
                  {selectedTransaction.customer_name || "Walk-in Customer"}
                </div>
              </div>
              <div>
                <div className="detail-label">Phone</div>
                <div className="detail-value">
                  {selectedTransaction.customer_phone || "N/A"}
                </div>
              </div>
              <div>
                <div className="detail-label">Payment Method</div>
                <div
                  className="detail-value"
                  style={{ textTransform: "capitalize" }}
                >
                  {selectedTransaction.payment_method || "N/A"}
                </div>
              </div>
              <div>
                <div className="detail-label">Reference</div>
                <div
                  className="detail-value"
                  style={{ fontFamily: "monospace", fontSize: "13px" }}
                >
                  {selectedTransaction.reference || "N/A"}
                </div>
              </div>
              {selectedTransaction.invoice_number && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Invoice Number</div>
                  <div className="detail-value">
                    {selectedTransaction.invoice_number}
                  </div>
                </div>
              )}
              {selectedTransaction.description && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Description</div>
                  <div className="detail-value">
                    {selectedTransaction.description}
                  </div>
                </div>
              )}
              {selectedTransaction.accountNumber && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Account Number</div>
                  <div
                    className="detail-value"
                    style={{ fontFamily: "monospace" }}
                  >
                    {selectedTransaction.accountNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons for Pending Transactions */}
            {selectedTransaction.status === "pending" && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <button
                  onClick={() => {
                    handleApproveTransaction(selectedTransaction.id);
                    setShowDetailsModal(false);
                    setSelectedTransaction(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#10b981",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#059669")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#10b981")
                  }
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => {
                    handleRejectTransaction(selectedTransaction.id);
                    setShowDetailsModal(false);
                    setSelectedTransaction(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#dc2626")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#ef4444")
                  }
                >
                  ❌ Reject
                </button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop:
                  selectedTransaction.status === "pending" ? "8px" : "16px",
                paddingTop:
                  selectedTransaction.status === "pending" ? "0" : "16px",
                borderTop:
                  selectedTransaction.status === "pending"
                    ? "none"
                    : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <button
                className="btn-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
