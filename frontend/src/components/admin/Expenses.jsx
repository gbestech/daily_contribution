// src/components/admin/Expenses.jsx
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useBranch } from "../../context/BranchContext"; // 🆕

const API_BASE_URL = "http://localhost:8000";

const CATEGORIES = [
  { value: "Rent", icon: "🏠" },
  { value: "Salary", icon: "👥" },
  { value: "Utilities", icon: "💡" },
  { value: "Transport", icon: "🚗" },
  { value: "Food", icon: "🍽️" },
  { value: "Office Supplies", icon: "📎" },
  { value: "Maintenance", icon: "🔧" },
  { value: "Marketing", icon: "📢" },
  { value: "Bank Charges", icon: "🏦" },
  { value: "Taxes", icon: "📊" },
  { value: "Other", icon: "📌" },
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "Cheque", "Other"];

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "⏳ Pending" },
  { value: "approved", label: "✅ Approved" },
  { value: "rejected", label: "❌ Rejected" },
];

const Expenses = () => {
  const { user } = useAuth();
  const { activeBranch, activeBranchId } = useBranch(); // 🆕
  const isAdmin = user?.role === "admin" || user?.role === "administrator";

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [statusTab, setStatusTab] = useState("all");

  const emptyForm = {
    category: "Rent",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    payment_method: "Cash",
    reference: "",
    vendor: "",
  };
  const [form, setForm] = useState(emptyForm);

  // 🆕 refetch when branch changes; reset filters so we don't hide everything
  useEffect(() => {
    setSearch("");
    setFilterCategory("all");
    setFilterMonth("");
    setStatusTab("all");
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // 🆕 If your backend does NOT scope by session, change this to:
      //   `${API_BASE_URL}/api/expenses.php?branch_id=${activeBranchId}`
      const res = await fetch(`${API_BASE_URL}/api/expenses.php`);
      const data = await res.json();
      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setForm({
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount,
      expense_date: expense.expense_date || "",
      payment_method: expense.payment_method || "Cash",
      reference: expense.reference || "",
      vendor: expense.vendor || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.category) return toast.error("Category is required");
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (!form.expense_date) return toast.error("Date is required");

    setSaving(true);
    try {
      const payload = {
        ...form,
        amount,
        recorded_by: user?.full_name || user?.name || user?.username || "User",
        recorded_by_role: user?.role || "member",
        auto_approve: isAdmin,
        // 🆕 branch scoping
        ...(activeBranchId ? { branch_id: activeBranchId } : {}),
      };

      const url = editing
        ? `${API_BASE_URL}/api/expenses.php/${editing.id}`
        : `${API_BASE_URL}/api/expenses.php`;
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.status) {
        toast.success(
          editing ? "Expense updated" : data.message || "Expense recorded",
        );
        setShowModal(false);
        setEditing(null);
        setForm(emptyForm);
        fetchExpenses();
      } else {
        toast.error(data.error || "Failed to save expense");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/expenses.php/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.status) {
        toast.success("Expense deleted");
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } else toast.error(data.error || "Delete failed");
    } catch {
      toast.error("Delete failed");
    }
  };

  // 🆕 merge server response into existing row instead of replacing with
  // data.expense (which may be undefined if the API returns { status: true })
  const mergeExpense = (updated) => {
    if (!updated || !updated.id) return;
    setExpenses((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
    );
  };

  const handleApprove = async (expense) => {
    if (!isAdmin) return toast.error("Only admins can approve");
    if (
      !window.confirm(
        `Approve ₦${Number(expense.amount).toLocaleString()} expense?`,
      )
    )
      return;

    setBusyId(expense.id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/expenses.php/${expense.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "approved",
            approved_by: user?.full_name || user?.name || "Admin",
          }),
        },
      );
      const data = await res.json();
      if (res.ok && data.status) {
        toast.success("✅ Expense approved");
        // optimistic update; then refetch to stay in sync
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expense.id
              ? { ...e, status: "approved", approved_by: user?.full_name }
              : e,
          ),
        );
        if (data.expense) mergeExpense(data.expense);
        fetchExpenses();
      } else toast.error(data.error || "Failed to approve");
    } catch {
      toast.error("Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (expense) => {
    if (!isAdmin) return toast.error("Only admins can reject");
    const reason = window.prompt(
      `Reason for rejecting this ₦${Number(expense.amount).toLocaleString()} expense?`,
      "",
    );
    if (reason === null) return;

    setBusyId(expense.id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/expenses.php/${expense.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "rejected",
            rejection_reason: reason || "No reason provided",
            approved_by: user?.full_name || user?.name || "Admin",
          }),
        },
      );
      const data = await res.json();
      if (res.ok && data.status) {
        toast.success("❌ Expense rejected");
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expense.id
              ? {
                  ...e,
                  status: "rejected",
                  rejection_reason: reason || "No reason provided",
                  approved_by: user?.full_name,
                }
              : e,
          ),
        );
        if (data.expense) mergeExpense(data.expense);
        fetchExpenses();
      } else toast.error(data.error || "Failed to reject");
    } catch {
      toast.error("Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = [...expenses];

    if (statusTab !== "all") list = list.filter((e) => e.status === statusTab);
    if (filterCategory !== "all")
      list = list.filter((e) => e.category === filterCategory);
    if (filterMonth)
      list = list.filter((e) => (e.expense_date || "").startsWith(filterMonth));
    if (search.trim()) {
      const t = search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.description?.toLowerCase().includes(t) ||
          e.vendor?.toLowerCase().includes(t) ||
          e.reference?.toLowerCase().includes(t),
      );
    }

    list.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    return list;
  }, [expenses, statusTab, filterCategory, filterMonth, search]);

  const stats = useMemo(() => {
    const approved = filtered.filter((e) => e.status === "approved");
    const pending = filtered.filter((e) => e.status === "pending");
    const total = approved.reduce((s, e) => s + (e.amount || 0), 0);
    const pendingAmt = pending.reduce((s, e) => s + (e.amount || 0), 0);

    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = approved
      .filter((e) => (e.expense_date || "").startsWith(key))
      .reduce((s, e) => s + (e.amount || 0), 0);

    return {
      total,
      pendingAmt,
      thisMonth,
      count: approved.length,
      pendingCount: pending.length,
    };
  }, [filtered]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(parseFloat(n) || 0);

  const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt)
      ? d
      : dt.toLocaleDateString("en-NG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  const statusBadge = (status) => {
    const map = {
      pending: { bg: "var(--pending-bg)", label: "⏳ PENDING" },
      approved: { bg: "var(--approved-bg)", label: "✅ APPROVED" },
      rejected: { bg: "var(--rejected-bg)", label: "❌ REJECTED" },
    };
    const s = map[status] || map.pending;
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 600,
          background: s.bg,
          color: "var(--badge-text)",
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text)",
          background: "var(--bg-app)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ⏳ Loading expenses...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        background: "var(--bg-app)",
        minHeight: "100vh",
        color: "var(--text)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .exp-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
        .exp-header h2 { font-size: 24px; font-weight: 700; margin: 0; color: var(--text); }
        .exp-header p { color: var(--text-muted); margin: 4px 0 0 0; font-size: 14px; }

        .exp-btn { padding: 10px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .exp-btn-primary { background: var(--accent); color: white; }
        .exp-btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
        .exp-btn-secondary { background: var(--bg-surface-2); color: var(--text); }
        .exp-btn-secondary:hover { background: var(--bg-surface-3); }

        /* ===== TABS — no container background ===== */
        .exp-tabs { display: flex; gap: 8px; padding: 0; margin-bottom: 20px; flex-wrap: wrap; }
        .exp-tab { padding: 8px 16px; border: none; border-radius: 8px; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .exp-tab:hover { background: var(--bg-surface-2); color: var(--text); }
        .exp-tab.active { background: var(--approved-bg); color: var(--badge-text); }
        .exp-tab .count { margin-left: 6px; background: rgba(0,0,0,0.15); padding: 1px 6px; border-radius: 8px; font-size: 10px; }

        /* ===== STAT CARDS — no background, no border ===== */
        .exp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .exp-stat { background: transparent; border: none; padding: 4px 0; }
        .exp-stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .exp-stat-value { font-size: 22px; font-weight: 700; margin-top: 6px; color: var(--text); }

        /* ===== FILTERS — no background, no border ===== */
        .exp-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .exp-input, .exp-select {
          background: var(--bg-surface-2);
          color: var(--text);
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          outline: none;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
          transition: box-shadow 0.2s;
        }
        .exp-input:focus, .exp-select:focus { box-shadow: 0 0 0 2px var(--accent-bg); }
        .exp-select option { background: var(--bg-surface); color: var(--text); }
        .exp-input::placeholder { color: var(--text-dim); }
        .exp-input::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

        /* ===== TABLE — no borders, no background ===== */
        .exp-table-wrap { background: transparent; border: none; border-radius: 0; overflow: auto; }
        table { width: 100%; border-collapse: collapse; background: transparent; }
        thead { background: transparent; }
        th {
          background: transparent;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border: none;
        }
        td {
          padding: 12px 16px;
          border: none;
          color: var(--text);
          font-size: 13px;
          vertical-align: middle;
          background: transparent;
        }
        tbody tr {
          border: none;
          background: transparent;
          transition: background-color 0.15s ease;
        }
        tbody tr:hover td { background: var(--bg-surface-2); }

        .exp-amount { color: var(--debit); font-weight: 600; white-space: nowrap; }
        .exp-cat { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--bg-surface-2); color: var(--text); }

        .exp-actions { display: flex; gap: 4px; }
        .exp-icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 15px;
          padding: 6px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .exp-icon-btn:hover { background: var(--bg-surface-2); }
        .exp-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .exp-empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
        .exp-empty-icon { font-size: 48px; margin-bottom: 10px; }

        /* ===== MODAL ===== */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-overlay);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-content {
          background: var(--bg-surface);
          border-radius: 14px;
          padding: 28px;
          max-width: 520px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: none;
          color: var(--text);
          box-shadow: var(--shadow-lg);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--text); }
        .modal-close { background: none; border: none; color: var(--text-muted); font-size: 26px; cursor: pointer; padding: 0 6px; }
        .modal-close:hover { color: var(--text); }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
        .form-input, .form-select {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: box-shadow 0.2s;
        }
        .form-input:focus, .form-select:focus { box-shadow: 0 0 0 2px var(--accent-bg); }
        .form-select option { background: var(--bg-surface); color: var(--text); }
        .form-input::placeholder { color: var(--text-dim); }
        .form-input::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

        .modal-btns { display: flex; gap: 10px; margin-top: 8px; }
        .modal-btns button { flex: 1; }

        @media (max-width: 600px) {
          .form-row { grid-template-columns: 1fr; }
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
              {activeBranch?.code || "—"} · Expenses for this branch only ·{" "}
              <strong style={{ color: "var(--debit)" }}>
                {expenses.length}
              </strong>{" "}
              records
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

      <div className="exp-header">
        <div>
          <h2>💸 Expenses</h2>
          <p>
            {isAdmin
              ? `Record and approve expenses for ${activeBranch?.name || "this branch"}`
              : `Record expenses for ${activeBranch?.name || "this branch"} — admin approval required`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="exp-btn exp-btn-secondary" onClick={fetchExpenses}>
            🔄 Refresh
          </button>
          <button className="exp-btn exp-btn-primary" onClick={openCreate}>
            ➕ Record Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="exp-tabs">
        {STATUS_TABS.map((t) => {
          const count =
            t.value === "all"
              ? expenses.length
              : expenses.filter((e) => e.status === t.value).length;
          return (
            <button
              key={t.value}
              className={`exp-tab ${statusTab === t.value ? "active" : ""}`}
              onClick={() => setStatusTab(t.value)}
            >
              {t.label}
              <span className="count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="exp-stats">
        <div className="exp-stat">
          <div className="exp-stat-label">💰 Approved Total</div>
          <div className="exp-stat-value" style={{ color: "var(--debit)" }}>
            {formatCurrency(stats.total)}
          </div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-label">⏳ Pending Amount</div>
          <div className="exp-stat-value" style={{ color: "var(--warning)" }}>
            {formatCurrency(stats.pendingAmt)}
          </div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-label">📅 This Month</div>
          <div className="exp-stat-value" style={{ color: "var(--info)" }}>
            {formatCurrency(stats.thisMonth)}
          </div>
        </div>
        <div className="exp-stat">
          <div className="exp-stat-label">📄 Records</div>
          <div className="exp-stat-value" style={{ color: "var(--text)" }}>
            {stats.count}
            {stats.pendingCount > 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--warning)",
                  marginLeft: 8,
                }}
              >
                + {stats.pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="exp-filters">
        <input
          type="text"
          className="exp-input"
          placeholder="🔍 Search description, vendor, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="exp-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">🏷️ All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.icon} {c.value}
            </option>
          ))}
        </select>
        <input
          type="month"
          className="exp-input"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="exp-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Vendor</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>Recorded By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="exp-empty">
                  <div className="exp-empty-icon">📭</div>
                  <p>
                    No expenses found in {activeBranch?.name || "this branch"}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    #{e.id}
                  </td>
                  <td>{formatDate(e.expense_date)}</td>
                  <td>
                    <span className="exp-cat">
                      {CATEGORIES.find((c) => c.value === e.category)?.icon ||
                        "📌"}{" "}
                      {e.category}
                    </span>
                  </td>
                  <td style={{ maxWidth: 240, color: "var(--text)" }}>
                    {e.description || "—"}
                    {e.rejection_reason && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--debit)",
                          marginTop: 3,
                        }}
                      >
                        ❌ {e.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ color: "var(--text)" }}>{e.vendor || "—"}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td className="exp-amount" style={{ textAlign: "right" }}>
                    −{formatCurrency(e.amount)}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {e.recorded_by || "—"}
                    {e.approved_by && e.status !== "pending" && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-dim)",
                          marginTop: 2,
                        }}
                      >
                        {e.status === "approved" ? "✅" : "❌"} {e.approved_by}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="exp-actions">
                      {isAdmin && e.status === "pending" && (
                        <>
                          <button
                            className="exp-icon-btn"
                            title="Approve"
                            disabled={busyId === e.id}
                            onClick={() => handleApprove(e)}
                            style={{ color: "var(--credit)" }}
                          >
                            ✅
                          </button>
                          <button
                            className="exp-icon-btn"
                            title="Reject"
                            disabled={busyId === e.id}
                            onClick={() => handleReject(e)}
                            style={{ color: "var(--debit)" }}
                          >
                            ❌
                          </button>
                        </>
                      )}
                      <button
                        className="exp-icon-btn"
                        title="Edit"
                        onClick={() => openEdit(e)}
                      >
                        ✏️
                      </button>
                      <button
                        className="exp-icon-btn"
                        title="Delete"
                        onClick={() => handleDelete(e.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editing ? "✏️ Edit Expense" : "➕ Record Expense"}
              </h3>
              <button
                className="modal-close"
                onClick={() => !saving && setShowModal(false)}
              >
                ×
              </button>
            </div>

            {/* 🆕 branch note */}
            <div
              style={{
                background: "var(--accent-bg)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: "var(--text)",
              }}
            >
              🏢 This expense will be recorded under{" "}
              <strong>{activeBranch?.name || "this branch"}</strong>.
            </div>

            {!isAdmin && !editing && (
              <div
                style={{
                  background: "var(--pending-bg)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 12,
                  color: "var(--badge-text)",
                }}
              >
                ⚠️ Your expense will be sent to an admin for approval before it
                counts.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₦) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What was this expense for?"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.expense_date}
                    onChange={(e) =>
                      setForm({ ...form, expense_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm({ ...form, payment_method: e.target.value })
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vendor (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.vendor}
                    onChange={(e) =>
                      setForm({ ...form, vendor: e.target.value })
                    }
                    placeholder="Who was paid?"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.reference}
                    onChange={(e) =>
                      setForm({ ...form, reference: e.target.value })
                    }
                    placeholder="Receipt / invoice #"
                  />
                </div>
              </div>

              <div className="modal-btns">
                <button
                  type="button"
                  className="exp-btn exp-btn-secondary"
                  onClick={() => !saving && setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="exp-btn exp-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "⏳ Saving..."
                    : editing
                      ? "Update"
                      : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
