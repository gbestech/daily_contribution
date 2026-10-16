// src/components/admin/Reshuffle.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import MemberShuffleButton from "../common/MemberShuffleButton";
import {
  getEligibleForDuration,
  buildMonthlyRotation,
  durationToMonths,
} from "../../utils/payoutRotation";

const API_BASE_URL = "http://localhost:8000";
const MEMBERS_PER_PAGE = 10;

// ----------------------------------------------------------------
// Rotation Pool Card — one for 6-month, one for 1-year
// ----------------------------------------------------------------
const RotationPoolCard = ({
  title,
  durationKey,
  eligibleMembers,
  onShuffle,
  slots,
  isShuffled,
  onReset,
}) => {
  const durationMonths = durationToMonths(durationKey);
  const eligibleCount = eligibleMembers.length;

  const firstUnfilledIndex = slots.findIndex((s) => !s.member);
  const filledCount = slots.filter((s) => s.member).length;

  return (
    <div className="rs-card" style={{ padding: 20 }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{title}</span>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                background: "rgba(16,185,129,0.15)",
                color: "var(--credit)",
                border: "1px solid rgba(16,185,129,0.35)",
              }}
            >
              {durationMonths} slots
            </span>
          </div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            <strong style={{ color: "var(--credit)" }}>{eligibleCount}</strong>{" "}
            eligible ·{" "}
            <strong style={{ color: "var(--info)" }}>{filledCount}</strong>{" "}
            assigned
            {eligibleCount > durationMonths && (
              <>
                {" · "}
                <span style={{ color: "var(--warning)" }}>
                  {eligibleCount - durationMonths} on waitlist
                </span>
              </>
            )}
            {eligibleCount < durationMonths && (
              <>
                {" · "}
                <span style={{ color: "var(--warning)" }}>
                  {durationMonths - eligibleCount} empty slots
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isShuffled && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                background: "rgba(59,130,246,0.15)",
                color: "var(--info)",
                border: "1px solid rgba(59,130,246,0.4)",
              }}
            >
              ● assigned
            </span>
          )}
          <button
            type="button"
            onClick={onShuffle}
            disabled={eligibleCount === 0}
            title={
              eligibleCount === 0
                ? "No eligible members for this pool"
                : "Assign each month to a random eligible member"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(59,130,246,0.4)",
              background: isShuffled ? "rgba(59,130,246,0.12)" : "transparent",
              color: "var(--info)",
              fontSize: 13,
              fontWeight: 600,
              cursor: eligibleCount === 0 ? "not-allowed" : "pointer",
              opacity: eligibleCount === 0 ? 0.5 : 1,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            🎲 Shuffle Months
          </button>
          {isShuffled && (
            <button
              type="button"
              onClick={onReset}
              title="Clear all assignments"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Table of slots */}
      {slots.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          Click <strong>🎲 Shuffle Months</strong> to assign members to each
          month.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table className="rs-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 90 }}>Month</th>
                <th>Member</th>
                <th>Account</th>
                <th style={{ textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const m = slot.member;
                const isEmpty = !m;
                const isNext = slot.month === firstUnfilledIndex + 1;

                return (
                  <tr
                    key={slot.month}
                    style={{
                      opacity: isEmpty ? 0.55 : 1,
                      background: isNext
                        ? "rgba(59,130,246,0.06)"
                        : "transparent",
                    }}
                  >
                    <td
                      style={{
                        fontWeight: 700,
                        color: isEmpty ? "var(--text-muted)" : "var(--text)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Month {slot.month}
                    </td>
                    <td>
                      {isEmpty ? (
                        <span style={{ color: "var(--text-dim)" }}>
                          — empty slot —
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "rgba(16,185,129,0.2)",
                              color: "var(--credit)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {(m.name || "U").charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {m.name || "—"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: isEmpty ? "var(--text-dim)" : "var(--info)",
                      }}
                    >
                      {m?.accountNumber || "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: isEmpty ? "var(--text-dim)" : "var(--credit)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m
                        ? new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(m.balance || 0)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------
// Main Reshuffle page
// ----------------------------------------------------------------
const Reshuffle = () => {
  const { activeBranch, activeBranchId } = useBranch();
  const { user } = useAuth();

  const roleStr = String(user?.role || "")
    .trim()
    .toLowerCase();
  const canUseReshuffle =
    roleStr === "admin" ||
    roleStr === "administrator" ||
    roleStr === "manager" ||
    roleStr === "branch_manager";

  const branchId = activeBranchId || user?.branch_id || null;

  // 🆕 Branch info fallback — fetches real branch name when context is empty
  const [fallbackBranch, setFallbackBranch] = useState(null);

  useEffect(() => {
    if (activeBranch?.name || !branchId) {
      setFallbackBranch(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/get-branch.php?id=${branchId}`);
        const data = await res.json();
        const b = data?.branch || data?.data?.branch || data?.data || null;
        if (!cancelled) setFallbackBranch(b || null);
      } catch {
        if (!cancelled) setFallbackBranch(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBranch?.name, branchId]);

  // 🆕 Resolved branch name + code (fallback-aware)
  const branchName =
    (activeBranch?.name && String(activeBranch.name).trim()) ||
    (fallbackBranch?.name && String(fallbackBranch.name).trim()) ||
    user?.branch_name ||
    (branchId ? `Branch #${branchId}` : "—");

  const branchCode =
    (activeBranch?.code && String(activeBranch.code).trim()) ||
    (fallbackBranch?.code && String(fallbackBranch.code).trim()) ||
    user?.branch_code ||
    "—";

  // Members + list shuffle
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [displayMembers, setDisplayMembers] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const originalMembersRef = useRef([]);

  // Payout rotation state
  const [sixMonthSlots, setSixMonthSlots] = useState([]);
  const [sixMonthAssigned, setSixMonthAssigned] = useState(false);
  const [oneYearSlots, setOneYearSlots] = useState([]);
  const [oneYearAssigned, setOneYearAssigned] = useState(false);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = branchId
        ? `/api/members.php?branch_id=${branchId}`
        : `/api/members.php`;
      const res = await apiFetch(url);
      const data = await res.json();
      const list = Array.isArray(data?.members) ? data.members : [];
      setMembers(list);
    } catch (err) {
      console.error("[Reshuffle] fetch failed:", err);
      setError(err.message || "Failed to load members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    originalMembersRef.current = members;
    setDisplayMembers(members);
    setIsShuffled(false);
    setSixMonthSlots([]);
    setOneYearSlots([]);
    setSixMonthAssigned(false);
    setOneYearAssigned(false);
  }, [members]);

  useEffect(() => {
    setPage(1);
    setIsShuffled(false);
  }, [searchTerm]);

  // Pools
  const sixMonthEligible = useMemo(
    () => getEligibleForDuration(members, "6 months"),
    [members],
  );
  const oneYearEligible = useMemo(
    () => getEligibleForDuration(members, "1 year"),
    [members],
  );

  // Search + paginate
  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return displayMembers;
    return displayMembers.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.phone || "").includes(q) ||
        (m.accountNumber || "").includes(q),
    );
  }, [displayMembers, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * MEMBERS_PER_PAGE,
    currentPage * MEMBERS_PER_PAGE,
  );

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const MemberAvatar = ({ member, size = 40 }) => {
    const raw =
      member?.passport_photo ||
      member?.image ||
      member?.avatar ||
      member?.photo ||
      member?.profile_image ||
      "";
    const imageUrl =
      raw && !raw.startsWith("http") && !raw.startsWith("data:")
        ? `${API_BASE_URL}/api/uploads/passports/${raw.replace(/^\/+/, "")}`
        : raw;

    const initial = (member?.name?.charAt(0) || "U").toUpperCase();
    const palette = [
      "rgba(16, 185, 129, 0.25)",
      "rgba(59, 130, 246, 0.25)",
      "rgba(168, 85, 247, 0.25)",
      "rgba(234, 179, 8, 0.25)",
      "rgba(239, 68, 68, 0.25)",
      "rgba(6, 182, 212, 0.25)",
    ];
    const textPalette = [
      "var(--credit)",
      "var(--info)",
      "var(--purple)",
      "var(--warning)",
      "var(--debit)",
      "#22d3ee",
    ];
    const idx = member?.id ? Math.abs(Number(member.id)) % palette.length : 0;

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={member?.name || "Member"}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            if (e.currentTarget.nextSibling) {
              e.currentTarget.nextSibling.style.display = "flex";
            }
          }}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid var(--border)",
            flexShrink: 0,
            backgroundColor: "var(--bg-surface-2)",
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: palette[idx],
          color: textPalette[idx],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: size * 0.42,
          flexShrink: 0,
          border: "2px solid var(--border)",
        }}
      >
        {initial}
      </div>
    );
  };

  const handleShuffleSixMonth = () => {
    const slots = buildMonthlyRotation(sixMonthEligible, 6);
    setSixMonthSlots(slots);
    setSixMonthAssigned(true);
  };
  const handleResetSixMonth = () => {
    setSixMonthSlots([]);
    setSixMonthAssigned(false);
  };

  const handleShuffleOneYear = () => {
    const slots = buildMonthlyRotation(oneYearEligible, 12);
    setOneYearSlots(slots);
    setOneYearAssigned(true);
  };
  const handleResetOneYear = () => {
    setOneYearSlots([]);
    setOneYearAssigned(false);
  };

  if (!canUseReshuffle) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Access restricted</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
          Only admins and managers can use the reshuffle tool.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        color: "var(--text)",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .rs-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .rs-table { width: 100%; border-collapse: collapse; }
        .rs-table th {
          padding: 12px 14px; text-align: left;
          font-size: 11px; font-weight: 700;
          color: var(--text-muted); text-transform: uppercase;
          letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .rs-table td {
          padding: 12px 14px; border-bottom: 1px solid var(--border);
          font-size: 13px; color: var(--text); vertical-align: middle;
        }
        .rs-table tr:hover { background-color: var(--bg-surface-2); }
        .rs-pagination {
          display: flex; justify-content: space-between;
          align-items: center; gap: 12px;
          padding: 16px 0; flex-wrap: wrap;
        }
        .rs-page-btn {
          min-width: 36px; height: 36px; padding: 0 12px;
          border-radius: 6px; border: 1px solid var(--border);
          background: transparent; color: var(--text);
          font-size: 13px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .rs-page-btn:hover:not(:disabled):not(.active) {
          background: var(--bg-surface-2);
        }
        .rs-page-btn.active {
          background: var(--accent); border-color: var(--accent); color: white;
        }
        .rs-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            🔀 Reshuffle & Payout Rotation
          </h2>
          <p
            style={{
              margin: "4px 0 0 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            Assign each month of a Cash plan to a different member. Two pools:{" "}
            <strong>6 months</strong> and <strong>1 year</strong>.
          </p>
        </div>
        <button
          onClick={fetchMembers}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--info)",
            background: "transparent",
            color: "var(--info)",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-block",
              animation: loading ? "spin 1s linear infinite" : "none",
            }}
          >
            🔄
          </span>
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      {/* Branch bar */}
      <div
        className="rs-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏢</span>
          <div>
            {/* 🆕 Real branch name */}
            <div style={{ fontSize: 15, fontWeight: 700 }}>{branchName}</div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              {/* 🆕 Real branch code + stats */}
              {branchCode !== "—" ? `Code: ${branchCode}` : "—"} ·{" "}
              <strong style={{ color: "var(--credit)" }}>
                {members.length}
              </strong>{" "}
              members ·{" "}
              <strong style={{ color: "var(--info)" }}>
                {sixMonthEligible.length}
              </strong>{" "}
              Cash·6mo ·{" "}
              <strong style={{ color: "var(--info)" }}>
                {oneYearEligible.length}
              </strong>{" "}
              Cash·1yr
            </div>
          </div>
        </div>

        {/* 🆕 Active branch pill */}
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            background: "rgba(16,185,129,0.2)",
            color: "var(--credit)",
            border: "1px solid rgba(16,185,129,0.4)",
          }}
        >
          ● active branch
        </span>
      </div>

      {/* PAYOUT ROTATION POOLS */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--text-muted)",
          marginBottom: 12,
        }}
      >
        💰 Cash Monthly Payout Rotation
      </div>

      <RotationPoolCard
        title="💵 Cash · 6 Months"
        durationKey="6 months"
        eligibleMembers={sixMonthEligible}
        slots={sixMonthSlots}
        isShuffled={sixMonthAssigned}
        onShuffle={handleShuffleSixMonth}
        onReset={handleResetSixMonth}
      />

      <RotationPoolCard
        title="💵 Cash · 1 Year"
        durationKey="1 year"
        eligibleMembers={oneYearEligible}
        slots={oneYearSlots}
        isShuffled={oneYearAssigned}
        onShuffle={handleShuffleOneYear}
        onReset={handleResetOneYear}
      />

      {/* FULL MEMBER LIST */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--text-muted)",
          margin: "32px 0 12px",
        }}
      >
        👥 All Branch Members (visual shuffle only)
      </div>

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search by name, email, phone, or account number…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "10px 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Showing:{" "}
          <span style={{ color: "var(--text)" }}>{filteredMembers.length}</span>{" "}
          {searchTerm && (
            <>
              of <span style={{ color: "var(--text)" }}>{members.length}</span>
            </>
          )}
        </div>

        {filteredMembers.length >= 2 && (
          <MemberShuffleButton
            members={filteredMembers}
            isShuffled={isShuffled}
            onShuffle={(shuffled) => {
              const ids = new Set(shuffled.map((m) => m.id));
              const untouched = displayMembers.filter((m) => !ids.has(m.id));
              setDisplayMembers([...shuffled, ...untouched]);
              setIsShuffled(true);
            }}
            onReset={() => {
              setDisplayMembers(originalMembersRef.current);
              setIsShuffled(false);
            }}
          />
        )}
      </div>

      <div className="rs-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                width: 32,
                height: 32,
                border: "3px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: 12,
              }}
            />
            <div>Loading members…</div>
          </div>
        ) : error ? (
          <div
            style={{ padding: 40, textAlign: "center", color: "var(--debit)" }}
          >
            ⚠️ {error}
          </div>
        ) : paginatedMembers.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            {searchTerm
              ? `No members match "${searchTerm}"`
              : "No members in this branch"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="rs-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Method / Duration</th>
                  <th>Account</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((m, i) => (
                  <tr key={m.id}>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {(currentPage - 1) * MEMBERS_PER_PAGE + i + 1}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <MemberAvatar member={m} size={40} />
                        <div style={{ fontWeight: 600 }}>{m.name || "—"}</div>
                      </div>
                    </td>
                    <td>
                      <div>{m.email || "—"}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {m.phone || "No phone"}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 10,
                          background:
                            String(m.savings_method || "").toLowerCase() ===
                            "cash"
                              ? "rgba(16,185,129,0.15)"
                              : "rgba(139,92,246,0.15)",
                          color:
                            String(m.savings_method || "").toLowerCase() ===
                            "cash"
                              ? "var(--credit)"
                              : "var(--purple)",
                          marginRight: 6,
                        }}
                      >
                        {m.savings_method || "—"}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {m.duration || "—"}
                      </span>
                    </td>
                    <td
                      style={{ fontFamily: "monospace", color: "var(--info)" }}
                    >
                      {m.accountNumber || "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: "var(--credit)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="rs-pagination">
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Page {currentPage} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="rs-page-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
              )
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span
                      style={{
                        padding: "0 6px",
                        color: "var(--text-muted)",
                        alignSelf: "center",
                      }}
                    >
                      …
                    </span>
                  )}
                  <button
                    className={`rs-page-btn ${p === currentPage ? "active" : ""}`}
                    onClick={() => goToPage(p)}
                    disabled={p === currentPage}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            <button
              className="rs-page-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reshuffle;
