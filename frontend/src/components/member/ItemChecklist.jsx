// src/components/member/ItemChecklist.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const ItemChecklist = ({ memberId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/items.php?member_id=${memberId}`,
      );
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleItem = async (item) => {
    const newChecked = item.checked ? 0 : 1;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i)),
    );

    try {
      const res = await fetch(`${API_BASE_URL}/api/member_items.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          item_id: item.id,
          checked: newChecked,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        newChecked ? `✅ Ticked: ${item.name}` : `Unticked: ${item.name}`,
      );
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, checked: item.checked } : i,
        ),
      );
      toast.error("Failed to update");
    }
  };

  if (!memberId) {
    return (
      <div style={{ padding: "24px", color: "var(--text-muted)" }}>
        ⚠️ Could not identify your member account. Please log out and back in.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div style={{ padding: "24px", color: "var(--text)" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "4px" }}>✅ My Items</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
          Tick the items you have or want to contribute.
          {items.length > 0 && (
            <span
              style={{
                marginLeft: "8px",
                color: "var(--credit)",
                fontWeight: 600,
              }}
            >
              ({checkedCount}/{items.length} selected)
            </span>
          )}
        </p>
      </div>

      {items.length === 0 ? (
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
          <p>No items available yet. Please check back later.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "12px",
          }}
        >
          {items.map((item) => (
            <label
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                border: `1px solid ${
                  item.checked ? "var(--credit)" : "var(--border)"
                }`,
                borderRadius: "10px",
                cursor: "pointer",
                background: item.checked
                  ? "rgba(16,185,129,0.08)"
                  : "transparent",
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={!!item.checked}
                onChange={() => toggleItem(item)}
                style={{
                  accentColor: "var(--credit)",
                  width: "18px",
                  height: "18px",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "15px" }}>
                  {item.name}
                </div>
                {item.description && (
                  <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {item.description}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemChecklist;
