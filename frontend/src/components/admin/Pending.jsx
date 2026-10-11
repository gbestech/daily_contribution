// src/components/admin/AdminPending.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";

const API_BASE_URL = "http://localhost:8000";

const AdminPending = () => {
  const { activeBranch, activeBranchId } = useBranch();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    total_amount: 0,
    deposits: 0,
    withdrawals: 0,
    transfers: 0,
    today: 0,
  });

  useEffect(() => {
    fetchPendingTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]); // 🆕 refetch when branch changes

  const fetchPendingTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/transactions.php");
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data = await response.json();

      let allTransactions = [];
      if (data.transactions && Array.isArray(data.transactions)) {
        allTransactions = data.transactions;
      } else if (Array.isArray(data)) {
        allTransactions = data;
      }

      const pending = allTransactions.filter((t) => t.status === "pending");

      const formatted = pending.map((t) => ({
        id: t.id,
        type: t.type || "deposit",
        amount: parseFloat(t.amount) || 0,
        customer: t.memberName || "Unknown",
        phone: t.accountNumber || "N/A",
        email: t.email || "N/A",
        date: t.date || new Date().toISOString(),
        payment_method: t.payment_method || "cash",
        reference: t.reference || `REF-${String(t.id).padStart(6, "0")}`,
        description: t.description || "",
        status: t.status || "pending",
        branch: activeBranch?.name || t.branch || "Main Branch",
        submitted_by: t.submitted_by || "Member",
        notes: t.notes || "Waiting for admin approval",
      }));

      setPendingRequests(formatted);

      const totalAmount = formatted.reduce((sum, r) => sum + r.amount, 0);
      const deposits = formatted.filter((r) => r.type === "deposit").length;
      const withdrawals = formatted.filter(
        (r) => r.type === "withdrawal",
      ).length;
      const transfers = formatted.filter((r) => r.type === "transfer").length;
      const today = formatted.filter((r) => {
        const todayDate = new Date().toDateString();
        return new Date(r.date).toDateString() === todayDate;
      }).length;

      setStats({
        total: formatted.length,
        total_amount: totalAmount,
        deposits,
        withdrawals,
        transfers,
        today,
      });
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
      toast.error("Failed to fetch pending transactions");
      setPendingRequests([]);
    } finally {
      setLoading(false);
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

  const getTypeIcon = (type) => {
    const icons = {
      deposit: "💰",
      withdrawal: "🏦",
      transfer: "🔄",
      contribution: "📊",
    };
    return icons[type] || "📋";
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

  const getPaymentMethodColors = (method) => {
    const map = {
      cash: { bg: "var(--approved-bg)", color: "var(--badge-text)" },
      bank_transfer: { bg: "var(--accent-bg)", color: "var(--badge-text)" },
      mobile_money: { bg: "var(--pending-bg)", color: "var(--badge-text)" },
      card: { bg: "var(--accent-bg)", color: "var(--badge-text)" },
    };
    return map[method] || { bg: "var(--bg-surface-3)", color: "var(--text)" };
  };

  const handleApprove = async (request) => {
    try {
      const response = await apiFetch(
        `/api/transactions.php/${request.id}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `✅ ${request.type.charAt(0).toUpperCase() + request.type.slice(1)} request from ${request.customer} approved successfully!`,
        );
        setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
        fetchPendingTransactions();
      } else {
        toast.error(data.message || "Failed to approve transaction");
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast.error("Failed to approve transaction");
    }
  };

  const handleReject = async (request) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const response = await apiFetch(
        `/api/transactions.php/${request.id}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.error(
          `❌ ${request.type.charAt(0).toUpperCase() + request.type.slice(1)} request from ${request.customer} rejected: ${rejectReason}`,
        );
        setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
        setRejectReason("");
        setShowRejectModal(false);
        fetchPendingTransactions();
      } else {
        toast.error(data.message || "Failed to reject transaction");
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast.error("Failed to reject transaction");
    }
  };

  const viewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const filteredRequests = () => {
    if (!searchTerm.trim()) return currentRequests;
    const term = searchTerm.toLowerCase().trim();
    return currentRequests.filter((r) => {
      return (
        r.customer.toLowerCase().includes(term) ||
        r.phone.includes(term) ||
        r.reference.toLowerCase().includes(term) ||
        r.type.toLowerCase().includes(term) ||
        r.branch.toLowerCase().includes(term)
      );
    });
  };

  const totalPages = Math.ceil(pendingRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = pendingRequests.slice(
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

  if (pendingRequests.length === 0) {
    return (
      <div
        style={{
          padding: "24px",
          color: "var(--text)",
          backgroundColor: "var(--bg-app)",
          minHeight: "100vh",
        }}
      >
        {/* ===== 🆕 BRANCH BANNER ===== */}
        <div
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
                {activeBranch?.code || "—"} · Pending approvals for this branch
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

        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "24px",
          }}
        >
          ⏳ Pending Approvals
        </h2>

        <div
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: "48px 20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
          <p>
            No pending approvals in{" "}
            <strong>{activeBranch?.name || "this branch"}</strong>
          </p>
          <p style={{ fontSize: "14px" }}>
            All transactions have been processed
          </p>
        </div>
      </div>
    );
  }

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

        .pending-table {
          width: 100%;
          border-collapse: collapse;
          background: transparent;
          border: none;
        }
        .pending-table thead {
          background: transparent;
        }
        .pending-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          background: transparent;
        }
        .pending-table td {
          padding: 12px 16px;
          border: none;
          background: transparent;
        }
        .pending-table tbody tr {
          border: none;
          background: transparent;
          transition: background-color 0.15s ease;
        }
        .pending-table tbody tr:hover {
          background-color: var(--bg-surface-2);
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          border: none;
        }
        .badge-pending {
          background-color: var(--pending-bg);
          color: var(--badge-text);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
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

        .search-input {
          width: 100%;
          padding: 10px 0;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          background: transparent;
          color: var(--text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .search-input:focus {
          border-bottom-color: var(--accent);
        }
        .search-input::placeholder {
          color: var(--text-dim);
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          margin-top: 4px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pagination-info {
          font-size: 13px;
          color: var(--text-muted);
        }
        .pagination-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .page-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background-color: var(--bg-surface-2);
          color: var(--text);
        }
        .page-btn.active {
          background-color: var(--accent);
          color: white;
        }
        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: var(--bg-overlay);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 16px;
        }
        .modal-content {
          background-color: var(--bg-surface);
          border-radius: 16px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--border);
          color: var(--text);
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
          color: var(--text);
        }
        .modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          font-size: 24px;
        }
        .modal-close:hover {
          color: var(--text);
        }

        .detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 14px;
        }
        .detail-label {
          font-size: 11px;
          color: var(--text-muted);
        }
        .detail-value {
          font-weight: 500;
          color: var(--text);
        }

        .btn-approve {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: var(--accent);
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          margin-right: 8px;
        }
        .btn-approve:hover {
          background: var(--accent-hover);
        }
        .btn-reject {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: var(--debit);
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-reject:hover {
          opacity: 0.85;
        }
        .btn-view {
          background: none;
          border: none;
          color: var(--info);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-view:hover {
          background: var(--accent-bg);
        }

        .btn-confirm {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-confirm-approve {
          background: var(--accent);
          color: white;
        }
        .btn-confirm-approve:hover {
          background: var(--accent-hover);
        }
        .btn-confirm-reject {
          background: var(--debit);
          color: white;
        }
        .btn-confirm-reject:hover {
          opacity: 0.85;
        }
        .btn-close-modal {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-close-modal:hover {
          background: var(--bg-surface-3);
        }
        .btn-cancel {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background: var(--bg-surface-3);
        }

        .textarea-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }
        .textarea-input:focus {
          border-color: var(--debit);
        }
        .textarea-input::placeholder {
          color: var(--text-dim);
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
          .pending-table {
            font-size: 12px;
          }
          .pending-table th,
          .pending-table td {
            padding: 8px 10px;
          }
        }
      `}</style>

      {/* ===== 🆕 BRANCH BANNER ===== */}
      <div
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
              {activeBranch?.code || "—"} · Pending approvals for this branch ·{" "}
              <strong style={{ color: "var(--warning)" }}>
                {pendingRequests.length}
              </strong>{" "}
              waiting
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

      <h2
        style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}
      >
        ⏳ Pending Approvals
      </h2>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Pending</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>
            {stats.total}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value" style={{ color: "var(--credit)" }}>
            {formatNaira(stats.total_amount)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Deposits</div>
          <div className="stat-value" style={{ color: "var(--credit)" }}>
            {stats.deposits}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Withdrawals</div>
          <div className="stat-value" style={{ color: "var(--debit)" }}>
            {stats.withdrawals}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transfers</div>
          <div className="stat-value" style={{ color: "var(--info)" }}>
            {stats.transfers}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today</div>
          <div className="stat-value" style={{ color: "var(--text)" }}>
            {stats.today}
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        className="search-input"
        placeholder="Search by customer, phone, reference, type, branch..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {searchTerm && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Found{" "}
          <span style={{ color: "var(--warning)", fontWeight: "600" }}>
            {filteredRequests().length}
          </span>{" "}
          pending request{filteredRequests().length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Table */}
      <div>
        <div style={{ overflowX: "auto" }}>
          <table className="pending-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests().length > 0 ? (
                filteredRequests().map((request) => {
                  const typeColors = getTypeColors(request.type);
                  const payColors = getPaymentMethodColors(
                    request.payment_method,
                  );
                  return (
                    <tr key={request.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "20px" }}>
                            {getTypeIcon(request.type)}
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: typeColors.bg,
                              color: typeColors.color,
                            }}
                          >
                            {request.type}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "500" }}>
                            {request.customer}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {request.phone}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "var(--credit)",
                          }}
                        >
                          {formatNaira(request.amount)}
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: payColors.bg,
                            color: payColors.color,
                          }}
                        >
                          {request.payment_method.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatDate(request.date)}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-pending">Pending</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            className="btn-view"
                            onClick={() => viewDetails(request)}
                          >
                            View
                          </button>
                          <button
                            className="btn-approve"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveModal(true);
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => {
                              setSelectedRequest(request);
                              setRejectReason("");
                              setShowRejectModal(true);
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px 20px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                        🔍
                      </div>
                      <p style={{ fontSize: "16px", fontWeight: "500" }}>
                        No pending requests found
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "var(--text-dim)",
                          marginTop: "4px",
                        }}
                      >
                        {searchTerm
                          ? `No requests matching "${searchTerm}"`
                          : "All requests have been processed"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pendingRequests.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, pendingRequests.length)} of{" "}
              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                {pendingRequests.length}
              </span>{" "}
              requests
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

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Request Details</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
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
                borderBottom: "1px solid var(--border)",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "32px" }}>
                {getTypeIcon(selectedRequest.type)}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "var(--credit)",
                  }}
                >
                  {formatNaira(selectedRequest.amount)}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <span
                    className="badge"
                    style={{
                      background: getTypeColors(selectedRequest.type).bg,
                      color: getTypeColors(selectedRequest.type).color,
                    }}
                  >
                    {selectedRequest.type}
                  </span>
                  <span className="badge badge-pending">Pending</span>
                </div>
              </div>
            </div>

            <div className="detail-row">
              <div>
                <div className="detail-label">Request ID</div>
                <div className="detail-value">#{selectedRequest.id}</div>
              </div>
              <div>
                <div className="detail-label">Date</div>
                <div className="detail-value">
                  {formatDate(selectedRequest.date)}
                </div>
              </div>
              <div>
                <div className="detail-label">Customer</div>
                <div className="detail-value">{selectedRequest.customer}</div>
              </div>
              <div>
                <div className="detail-label">Phone</div>
                <div className="detail-value">{selectedRequest.phone}</div>
              </div>
              <div>
                <div className="detail-label">Email</div>
                <div className="detail-value">{selectedRequest.email}</div>
              </div>
              <div>
                <div className="detail-label">Branch</div>
                <div className="detail-value">{selectedRequest.branch}</div>
              </div>
              <div>
                <div className="detail-label">Payment Method</div>
                <div
                  className="detail-value"
                  style={{ textTransform: "capitalize" }}
                >
                  {selectedRequest.payment_method.replace("_", " ")}
                </div>
              </div>
              <div>
                <div className="detail-label">Reference</div>
                <div
                  className="detail-value"
                  style={{ fontFamily: "monospace", fontSize: "13px" }}
                >
                  {selectedRequest.reference}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="detail-label">Description</div>
                <div className="detail-value">
                  {selectedRequest.description}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="detail-label">Notes</div>
                <div className="detail-value">{selectedRequest.notes}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="detail-label">Submitted By</div>
                <div className="detail-value">
                  {selectedRequest.submitted_by}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn-close-modal"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
              >
                Close
              </button>
              <button
                className="btn-confirm btn-confirm-approve"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleApprove(selectedRequest);
                }}
              >
                Approve
              </button>
              <button
                className="btn-confirm btn-confirm-reject"
                onClick={() => {
                  setShowDetailsModal(false);
                  setRejectReason("");
                  setShowRejectModal(true);
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Approval</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
              <p style={{ fontSize: "16px", fontWeight: "500" }}>
                Approve {selectedRequest.type} request?
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Customer: <strong>{selectedRequest.customer}</strong>
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                Amount:{" "}
                <strong style={{ color: "var(--credit)" }}>
                  {formatNaira(selectedRequest.amount)}
                </strong>
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  marginTop: "8px",
                }}
              >
                Branch: {selectedRequest.branch}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm btn-confirm-approve"
                onClick={() => {
                  handleApprove(selectedRequest);
                  setShowApproveModal(false);
                }}
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Reject Request</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectReason("");
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                Customer: <strong>{selectedRequest.customer}</strong>
              </div>
              <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                Amount:{" "}
                <strong style={{ color: "var(--debit)" }}>
                  {formatNaira(selectedRequest.amount)}
                </strong>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                Branch: {selectedRequest.branch}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                  color: "var(--text)",
                }}
              >
                Reason for Rejection *
              </label>
              <textarea
                className="textarea-input"
                placeholder="Please provide a reason for rejecting this request..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm btn-confirm-reject"
                onClick={() => {
                  handleReject(selectedRequest);
                  setShowRejectModal(false);
                }}
                disabled={!rejectReason.trim()}
                style={{
                  opacity: !rejectReason.trim() ? 0.5 : 1,
                  cursor: !rejectReason.trim() ? "not-allowed" : "pointer",
                }}
              >
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPending;
