// src/components/common/MemberShuffleButton.jsx
import React from "react";
import toast from "react-hot-toast";

/**
 * MemberShuffleButton
 * -------------------
 * A drop-in, controlled, cosmetic-only shuffle button for member lists.
 *
 * Features
 *  - Reorders an array of members client-side (Fisher–Yates).
 *  - Never touches the database or calls any API.
 *  - Guarantees the shuffled order is visibly different from the original.
 *  - Shows exactly ONE toast per action.
 *  - When `isShuffled` is true, a small "Reset" link appears to restore order.
 *  - Fully theme-agnostic — inherits colors from the parent.
 *
 * Props
 *  - members   : Array   — the list to shuffle (already branch-scoped by parent)
 *  - onShuffle : func    — (shuffledArray) => void
 *  - onReset   : func    — () => void
 *  - isShuffled: boolean — whether the list is currently in shuffled state
 *  - disabled  : boolean — optional, disables both buttons
 *  - label     : string  — optional, default "Shuffle"
 */
const MemberShuffleButton = ({
  members = [],
  onShuffle,
  onReset,
  isShuffled = false,
  disabled = false,
  label = "Shuffle",
}) => {
  // -------------------------------------------------------------
  // Fisher–Yates shuffle, guaranteed to differ from the input
  // (when there are at least 2 items).
  // -------------------------------------------------------------
  const shuffleArrayDistinct = (input) => {
    const arr = [...input];
    const n = arr.length;

    if (n < 2) return arr;

    // Small helper to do one Fisher–Yates pass
    const fyShuffle = (a) => {
      const out = [...a];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };

    // Try a few times to get a different order
    let attempt = fyShuffle(arr);
    let tries = 0;
    while (
      tries < 5 &&
      attempt.length > 1 &&
      attempt.every((item, idx) => item === arr[idx])
    ) {
      attempt = fyShuffle(arr);
      tries++;
    }
    return attempt;
  };

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const handleShuffle = () => {
    if (disabled) return;

    if (!Array.isArray(members) || members.length < 2) {
      toast.error("Nothing to shuffle — need at least 2 members");
      return;
    }

    const shuffled = shuffleArrayDistinct(members);
    if (typeof onShuffle === "function") {
      onShuffle(shuffled);
    }
    toast.success(`🔀 Shuffled ${shuffled.length} members`);
  };

  const handleReset = () => {
    if (disabled) return;

    if (typeof onReset === "function") {
      onReset();
    }
    toast.success("↺ Restored original order");
  };

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={handleShuffle}
        disabled={disabled || members.length < 2}
        title="Randomly reorder the members (visual only — nothing is saved)"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          background: isShuffled ? "rgba(59, 130, 246, 0.12)" : "transparent",
          color: "var(--info, #60a5fa)",
          fontSize: "13px",
          fontWeight: 600,
          cursor: disabled || members.length < 2 ? "not-allowed" : "pointer",
          opacity: disabled || members.length < 2 ? 0.5 : 1,
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        🔀 {label}
      </button>

      {isShuffled && (
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          title="Restore the original order"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border, rgba(148,163,184,0.3))",
            background: "transparent",
            color: "var(--text-muted, #94a3b8)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          ↺ Reset
        </button>
      )}
    </div>
  );
};

export default MemberShuffleButton;
