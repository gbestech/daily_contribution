// src/components/admin/ItemManager.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext"; // 🆕

const API_BASE_URL = "http://localhost:8000";

const ItemManager = () => {
  const { activeBranch, activeBranchId } = useBranch(); // 🆕

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    value: "",
  });

  // 🆕 Branch-aware fetch helper (inside the component so it sees activeBranchId)
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem("token");

      const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };

      // 🆕 Append ?branch_id= to every request
      const finalUrl = activeBranchId
        ? `${url}${url.includes("?") ? "&" : "?"}branch_id=${activeBranchId}`
        : url;

      console.log("[ItemManager] fetching:", finalUrl);

      const res = await fetch(finalUrl, {
        credentials: "include",
        ...options,
        headers,
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.error("❌ Non-JSON response from", finalUrl, "\n", text);
        throw new Error(`Server returned non-JSON (${res.status})`);
      }

      if (!res.ok) {
        console.error("❌ API error", res.status, finalUrl, data);
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

  // 🆕 refetch when branch changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems, activeBranchId]);

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

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

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

  return (
    <div style={{ padding: "24px", color: "var(--text)" }}>
      <style>{`
        .im-modal-overlay {
          position: fixed; inset: 0;
          background-color: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
          animation: imFadeIn 0.2s ease;
        }
        @keyframes imFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes imSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .im-modal-content {
          background-color: var(--bg-surface, #1a1a2e);
          border-radius: 16px;
          padding: 28px 32px;
          width: 100%;
          max-width: 460px;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          animation: imSlideUp 0.25s ease;
          box-sizing: border-box;
        }
        .im-modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 20px;
        }
        .im-modal-title {
          font-size: 18px; font-weight: 700;
          color: var(--text, #fff); margin: 0;
        }
        .im-modal-close {
          background: none; border: none;
          color: var(--text-muted, #888);
          cursor: pointer; padding: 4px;
          font-size: 22px; line-height: 1;
          transition: color 0.15s;
        }
        .im-modal-close:hover { color: var(--text, #fff); }
        .im-form-group { margin-bottom: 18px; display: flex; flex-direction: column; }
        .im-form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #fff);
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }
        .im-form-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid var(--border, rgba(255,255,255,0.15));
          background-color: var(--bg-surface-2, rgba(255,255,255,0.04));
          color: var(--text, #fff);
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, background-color 0.15s;
          font-family: inherit;
        }
        .im-form-input:focus {
          border-color: var(--credit, #10b981);
          background-color: var(--bg-surface-3, rgba(255,255,255,0.06));
        }
        .im-form-input::placeholder { color: var(--text-dim, #666); }
        .im-modal-buttons {
          display: flex;
          gap: 10px;
          margin-top: 24px;
          justify-content: flex-end;
        }
        .im-btn {
          padding: 11px 22px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
          font-family: inherit;
          min-width: 110px;
        }
        .im-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .im-btn-cancel {
          background: transparent;
          color: var(--text-muted, #aaa);
          border-color: var(--border, rgba(255,255,255,0.15));
        }
        .im-btn-cancel:hover {
          background-color: var(--bg-surface-2, rgba(255,255,255,0.04));
          color: var(--text, #fff);
        }
        .im-btn-submit {
          background: linear-gradient(to right, #059669, #0d9488);
          color: #fff;
          border: none;
        }
        .im-btn-submit:hover { filter: brightness(1.1); }
      `}</style>

      {/* 🆕 Branch banner */}
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
              <strong style={{ color: "var(--credit)" }}>{items.length}</strong>{" "}
              items
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

      {/* HEADER */}
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
          <h2 style={{ margin: 0, fontSize: "22px" }}>🧾 Contributor Items</h2>
          <p
            style={{
              margin: "4px 0 0",
              color: "var(--text-muted)",
              fontSize: "14px",
            }}
          >
            Create items for{" "}
            <strong>{activeBranch?.name || "this branch"}</strong> that members
            can tick.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "transparent",
              color: "var(--info)",
              border: "1px solid var(--info)",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: refreshing ? "wait" : "pointer",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? "⏳ Refreshing…" : "🔄 Refresh"}
          </button>

          <button
            onClick={openCreate}
            style={{
              background: "transparent",
              color: "var(--credit)",
              border: "1px solid var(--credit)",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ➕ New Item
          </button>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading items…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
            border: "1px dashed var(--border)",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>📭</div>
          <p>
            No items yet in {activeBranch?.name || "this branch"}. Click "New
            Item" to add one.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item Name</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
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
                      className={`badge ${item.active ? "badge-active" : "badge-inactive"}`}
                    >
                      {item.active ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openEdit(item)}
                        className="action-btn action-btn-edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleActive(item)}
                        className="action-btn action-btn-view"
                        title={item.active ? "Hide" : "Show"}
                      >
                        {item.active ? "🙈" : "👁️"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="action-btn action-btn-delete"
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

      {/* MODAL */}
      {showModal && (
        <div className="im-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="im-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
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

            {/* 🆕 branch hint in modal */}
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
              <div className="im-form-group">
                <label className="im-form-label">Item Name *</label>
                <input
                  type="text"
                  className="im-form-input"
                  placeholder="e.g. Refrigerator"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="im-form-group">
                <label className="im-form-label">Description / Category</label>
                <input
                  type="text"
                  className="im-form-input"
                  placeholder="e.g. Kitchen appliance"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="im-form-group">
                <label className="im-form-label">Value (₦) — optional</label>
                <input
                  type="number"
                  className="im-form-input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>

              <div className="im-modal-buttons">
                <button
                  type="button"
                  className="im-btn im-btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="im-btn im-btn-submit"
                  disabled={saving}
                >
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
