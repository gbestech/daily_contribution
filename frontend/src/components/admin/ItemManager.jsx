// src/components/admin/ItemManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext";

const API_BASE_URL = "http://localhost:8000";

const ItemManager = () => {
  const { activeBranch, activeBranchId } = useBranch();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    name: "",
    description: "",
    value: "",
  });

  // ---------- API ----------
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem("token");
      const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };

      const finalUrl = activeBranchId
        ? `${url}${url.includes("?") ? "&" : "?"}branch_id=${activeBranchId}`
        : url;

      const res = await fetch(finalUrl, { ...options, headers });
      const text = await res.text();

      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Server returned non-JSON (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      return data;
    },
    [activeBranchId],
  );

  const fetchItems = useCallback(
    async (showToast = false) => {
      setLoading(true);
      try {
        const data = await apiFetch(`${API_BASE_URL}/api/items.php`);
        setItems(data?.items || []);
        if (showToast) toast.success("✅ Items refreshed!");
      } catch (err) {
        console.error("Fetch items failed:", err);
        toast.error(err.message || "Failed to load items");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems, activeBranchId]);

  // ---------- Actions ----------
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems(true);
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", value: "" });
    setEditingItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      value: item.value || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      value: parseFloat(form.value) || 0,
    };

    setSaving(true);
    try {
      const url = editingItem
        ? `${API_BASE_URL}/api/items.php/${editingItem.id}`
        : `${API_BASE_URL}/api/items.php`;
      const method = editingItem ? "PUT" : "POST";

      await apiFetch(url, { method, body: JSON.stringify(payload) });

      toast.success(editingItem ? "✅ Item updated!" : "✅ Item created!");
      setShowModal(false);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error("Save item failed:", err);
      toast.error(err.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "⚠️ Delete this item? Members who ticked it will lose it.",
      )
    )
      return;
    try {
      await apiFetch(`${API_BASE_URL}/api/items.php/${id}`, {
        method: "DELETE",
      });
      toast.success("✅ Item deleted!");
      fetchItems();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Failed to delete");
    }
  };

  const toggleActive = async (item) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/items.php/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: item.active ? 0 : 1 }),
      });
      toast.success(item.active ? "Item hidden" : "Item visible");
      fetchItems();
    } catch (err) {
      console.error("Toggle failed:", err);
      toast.error(err.message || "Failed to update");
    }
  };

  // ---------- Derived ----------
  const filtered = useMemo(() => {
    let list = [...items];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(term) ||
          i.description?.toLowerCase().includes(term),
      );
    }
    if (filterStatus === "visible") list = list.filter((i) => i.active);
    if (filterStatus === "hidden") list = list.filter((i) => !i.active);
    return list;
  }, [items, searchTerm, filterStatus]);

  const counts = useMemo(
    () => ({
      total: items.length,
      visible: items.filter((i) => i.active).length,
      hidden: items.filter((i) => !i.active).length,
      totalValue: items.reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0),
    }),
    [items],
  );

  // ---------- Loading ----------
  if (loading && items.length === 0) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text)",
          backgroundColor: "var(--bg-app)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ⏳ Loading items...
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
        color: "var(--text)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes imSpin { to { transform: rotate(360deg); } }
        .im-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; flex-wrap: wrap;
          gap: 16px; margin-bottom: 24px;
        }
        .im-header h2 {
          font-size: 24px; font-weight: 700; margin: 0;
          color: var(--text);
        }
        .im-header p {
          color: var(--text-muted); margin: 4px 0 0 0; font-size: 14px;
        }
        .im-btn-outline {
          padding: 10px 18px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s, opacity 0.15s;
        }
        .im-btn-outline:hover:not(:disabled) { background: var(--bg-surface-3); }
        .im-btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
        .im-btn-primary {
          padding: 10px 18px;
          border-radius: 8px;
          border: 1px solid rgba(16, 185, 129, 0.5);
          background: rgba(16, 185, 129, 0.12);
          color: var(--credit);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s;
        }
        .im-btn-primary:hover:not(:disabled) { background: rgba(16, 185, 129, 0.2); }
        .im-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .im-btn-primary .im-spin { display: inline-block; animation: imSpin 1s linear infinite; }

        .im-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px; margin-bottom: 20px;
        }
        .im-stat {
          display: flex; flex-direction: column; gap: 6px;
        }
        .im-stat-label {
          font-size: 12px; color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px; font-weight: 600;
        }
        .im-stat-value { font-size: 22px; font-weight: 700; }

        .im-filter-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .im-filter-input, .im-filter-select {
          background: var(--bg-surface-2);
          color: var(--text);
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          outline: none;
          font-size: 14px;
          transition: box-shadow 0.2s;
        }
        .im-filter-input { flex: 1; min-width: 220px; }
        .im-filter-input::placeholder { color: var(--text-dim); }
        .im-filter-input:focus, .im-filter-select:focus {
          box-shadow: 0 0 0 2px var(--accent-bg);
        }
        .im-filter-select option {
          background: var(--bg-surface); color: var(--text);
        }

        .im-table-wrap {
          overflow: auto;
        }
        .im-table-wrap table {
          width: 100%; border-collapse: collapse; background: transparent;
        }
        .im-table-wrap th {
          color: var(--text-muted);
          font-size: 11px; font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border: none;
        }
        .im-table-wrap td {
          padding: 12px 16px;
          color: var(--text); font-size: 13px;
          vertical-align: middle;
          border: none;
        }
        .im-table-wrap tbody tr {
          transition: background-color 0.15s ease;
        }
        .im-table-wrap tbody tr:hover td {
          background: var(--bg-surface-2);
        }

        .im-action-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .im-action-btn:hover { background: var(--bg-surface-2); }

        .im-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          border: 1px dashed var(--border);
          border-radius: 12px;
        }
        .im-empty-icon { font-size: 48px; margin-bottom: 8px; }

        .im-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .im-modal {
          background: var(--bg-surface, #1a1a2e);
          border-radius: 16px;
          padding: 28px 32px;
          width: 100%;
          max-width: 460px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          box-sizing: border-box;
        }
        .im-modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 20px;
        }
        .im-modal-title {
          font-size: 18px; font-weight: 700; margin: 0;
          color: var(--text);
        }
        .im-modal-close {
          background: none; border: none;
          color: var(--text-muted);
          cursor: pointer; padding: 4px;
          font-size: 22px; line-height: 1;
        }
        .im-modal-close:hover { color: var(--text); }
        .im-field { margin-bottom: 18px; display: flex; flex-direction: column; }
        .im-field label {
          font-size: 13px; font-weight: 600;
          color: var(--text); margin-bottom: 8px;
        }
        .im-field input {
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 14px;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .im-field input:focus { border-color: var(--credit); }
        .im-field input::placeholder { color: var(--text-dim); }
        .im-modal-actions {
          display: flex; gap: 10px; margin-top: 24px;
          justify-content: flex-end;
        }
        .im-cancel {
          padding: 11px 22px;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border);
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .im-cancel:hover { color: var(--text); background: var(--bg-surface-2); }
        .im-submit {
          padding: 11px 22px;
          border-radius: 8px;
          background: linear-gradient(to right, #059669, #0d9488);
          color: #fff;
          border: none;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .im-submit:hover:not(:disabled) { filter: brightness(1.1); }
        .im-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* Branch banner — matches Staff.jsx */}
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
              {activeBranch?.code || "—"} · Items for this branch only ·{" "}
              <strong style={{ color: "var(--credit)" }}>{counts.total}</strong>{" "}
              items ·{" "}
              <strong style={{ color: "var(--info)" }}>{counts.visible}</strong>{" "}
              visible
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
      <div className="im-header">
        <div>
          <h2>🧾 Contributor Items</h2>
          <p>
            Create items for{" "}
            <strong>{activeBranch?.name || "this branch"}</strong> that members
            can tick.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="im-btn-outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <span className={refreshing ? "im-spin" : ""}>🔄</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="im-btn-primary" onClick={openCreate}>
            ➕ New Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="im-stats">
        <div className="im-stat">
          <span className="im-stat-label">📦 Total</span>
          <span className="im-stat-value" style={{ color: "var(--text)" }}>
            {counts.total}
          </span>
        </div>
        <div className="im-stat">
          <span className="im-stat-label">👁️ Visible</span>
          <span className="im-stat-value" style={{ color: "var(--credit)" }}>
            {counts.visible}
          </span>
        </div>
        <div className="im-stat">
          <span className="im-stat-label">🙈 Hidden</span>
          <span
            className="im-stat-value"
            style={{ color: "var(--text-muted)" }}
          >
            {counts.hidden}
          </span>
        </div>
        <div className="im-stat">
          <span className="im-stat-label">💰 Total Value</span>
          <span className="im-stat-value" style={{ color: "var(--info)" }}>
            {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              maximumFractionDigits: 0,
            }).format(counts.totalValue)}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="im-filter-bar">
        <input
          type="text"
          className="im-filter-input"
          placeholder="🔍 Search by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="im-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">📋 All Status</option>
          <option value="visible">👁️ Visible</option>
          <option value="hidden">🙈 Hidden</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">📭</div>
          <p>
            {items.length === 0
              ? `No items yet in ${activeBranch?.name || "this branch"}. Click "New Item" to add one.`
              : "No items match your search."}
          </p>
        </div>
      ) : (
        <div className="im-table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item Name</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Value</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    #{item.id}
                  </td>
                  <td style={{ color: "var(--text)", fontWeight: 500 }}>
                    {item.name}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {item.description || "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: "var(--credit)",
                      fontWeight: 600,
                    }}
                  >
                    {item.value > 0
                      ? new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(item.value)
                      : "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        borderRadius: "20px",
                        backgroundColor: item.active
                          ? "var(--approved-bg)"
                          : "var(--rejected-bg)",
                        color: "var(--badge-text)",
                        fontWeight: "600",
                      }}
                    >
                      {item.active ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => openEdit(item)}
                        className="im-action-btn"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleActive(item)}
                        className="im-action-btn"
                        title={item.active ? "Hide" : "Show"}
                      >
                        {item.active ? "🙈" : "👁️"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="im-action-btn"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="im-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="im-modal" onClick={(e) => e.stopPropagation()}>
            <div className="im-modal-header">
              <h3 className="im-modal-title">
                {editingItem ? "✏️ Edit Item" : "➕ New Item"}
              </h3>
              <button
                className="im-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "var(--accent-bg, rgba(16,185,129,0.1))",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: "var(--text)",
              }}
            >
              🏢 This item will be created in{" "}
              <strong>{activeBranch?.name || "this branch"}</strong>.
            </div>

            <form onSubmit={handleSubmit}>
              <div className="im-field">
                <label>Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Refrigerator"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="im-field">
                <label>Description / Category</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen appliance"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="im-field">
                <label>Value (₦) — optional</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>

              <div className="im-modal-actions">
                <button
                  type="button"
                  className="im-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="im-submit" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : editingItem
                      ? "Save Changes"
                      : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemManager;