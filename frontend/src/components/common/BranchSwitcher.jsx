// src/components/common/BranchSwitcher.jsx
import React, { useState, useEffect, useRef } from "react";
import { useBranch } from "../../context/BranchContext";

const BranchSwitcher = () => {
  const {
    activeBranch,
    activeBranchId,
    branches,
    loading,
    switchBranch,
    refreshBranches,
  } = useBranch();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Refresh the list of branches on mount (and every time the dropdown opens)
  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ---- Defensive: is the active branch actually in the loaded list? ----
  const activeInList = activeBranchId
    ? branches.find((b) => String(b.id) === String(activeBranchId))
    : null;

  // Only show the branch name if it's confirmed to still exist.
  const displayName = activeInList
    ? activeInList.name || activeInList.code || `Branch #${activeInList.id}`
    : branches.length === 0
      ? "No branches"
      : "Select branch";

  const displayCode = activeInList ? activeInList.code || "—" : "";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refreshBranches();
        }}
        title={
          activeInList ? `${displayName} (${displayCode})` : "Select a branch"
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "20px",
          border: `1px solid ${
            activeInList ? "var(--accent)" : "var(--border)"
          }`,
          background: activeInList ? "var(--accent-bg)" : "var(--bg-surface-2)",
          color: activeInList ? "var(--accent-text)" : "var(--text)",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "600",
          transition: "all 0.2s",
          maxWidth: "220px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "15px" }}>🏢</span>
        <span
          style={{
            maxWidth: "140px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {loading && !activeInList ? "Loading…" : displayName}
        </span>
        <span style={{ fontSize: "9px", opacity: 0.7 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            minWidth: "240px",
            maxHeight: "320px",
            overflowY: "auto",
            padding: "6px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 60,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              fontSize: "11px",
              fontWeight: "700",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Switch Branch
          </div>

          {branches.length === 0 ? (
            <div
              style={{
                padding: "16px 12px",
                color: "var(--text-muted)",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              No branches available
            </div>
          ) : (
            branches.map((b) => {
              const isActive =
                activeBranchId && String(b.id) === String(activeBranchId);
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    switchBranch(b);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 12px",
                    background: isActive ? "var(--approved-bg)" : "transparent",
                    border: "none",
                    borderRadius: "8px",
                    color: isActive ? "var(--accent-text)" : "var(--text)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: isActive ? "600" : "400",
                    textAlign: "left",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-surface-2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span style={{ fontSize: "14px" }}>🏢</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {b.name || b.code || `Branch #${b.id}`}
                    </div>
                    {b.code && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {b.code}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <span
                      style={{ color: "var(--accent-text)", fontSize: "12px" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;
