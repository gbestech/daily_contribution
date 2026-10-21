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

// ────────────────────────────────────────────────────────────
// Tolerant API reader — works whether apiFetch returns a
// Response (needs .json()) or already-parsed JSON.
// ────────────────────────────────────────────────────────────
const callApi = async (url, options) => {
  let res;
  try {
    res = await apiFetch(url, options);
  } catch (err) {
    console.error(`[reshuffle] ${url} → network error:`, err);
    throw new Error(err?.message || "Network error");
  }

  // Response-like object
  if (res && typeof res === "object" && "ok" in res && "status" in res) {
    let text = "";
    let data = null;
    try {
      text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
    } catch (err) {
      console.warn(`[reshuffle] ${url} → body read failed:`, err);
    }
    if (!res.ok) {
      const detail = data?.error || data?.message || `HTTP ${res.status}`;
      console.error(
        `[reshuffle] ${url} → ${detail}`,
        data ?? text?.slice(0, 400),
      );
      throw new Error(detail);
    }
    return data;
  }

  // Already-parsed JSON
  if (res && typeof res === "object") {
    if (res.success === false || res.status === false || res.error) {
      const detail = res.error || res.message || "Request failed";
      console.error(`[reshuffle] ${url} → ${detail}`, res);
      throw new Error(detail);
    }
    return res;
  }

  return res ?? null;
};

// ────────────────────────────────────────────────────────────
// Rotation persistence (localStorage)
// ────────────────────────────────────────────────────────────
const ROTATION_STORAGE_KEY = "payout_rotation_v1";

const readAllRotations = () => {
  try {
    return JSON.parse(localStorage.getItem(ROTATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeAllRotations = (all) => {
  try {
    localStorage.setItem(ROTATION_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("[reshuffle] localStorage write failed:", e);
  }
};

const persistRotation = (durationKey, amount, slots, collectedSet) => {
  const all = readAllRotations();
  const key = `${durationKey}::${Math.round(amount)}`;
  all[key] = {
    durationKey,
    amount: Math.round(amount),
    slots: slots.map((s) => ({
      month: s.month,
      memberId: s.member?.id ?? null,
      memberName: s.member?.name ?? null,
      accountNumber: s.member?.accountNumber ?? null,
    })),
    collected: Array.from(collectedSet || []).map(String),
    updatedAt: new Date().toISOString(),
  };
  writeAllRotations(all);
};

const clearPersistedRotation = (durationKey, amount) => {
  const all = readAllRotations();
  const key = `${durationKey}::${Math.round(amount)}`;
  delete all[key];
  writeAllRotations(all);
};

const persistCollected = (durationKey, amount, slots, collectedSet) => {
  persistRotation(durationKey, amount, slots, collectedSet);
};

// Rehydrate a stored rotation for one (duration, amount) into slot objects
const rehydrateSlots = (storedEntry, membersById) => {
  if (!storedEntry || !Array.isArray(storedEntry.slots)) return [];
  return storedEntry.slots.map((s) => {
    const memberId = s.memberId ?? null;
    const member = memberId !== null ? membersById.get(String(memberId)) : null;
    return {
      month: s.month,
      member: member || null,
    };
  });
};

// ────────────────────────────────────────────────────────────
// Misc helpers
// ────────────────────────────────────────────────────────────
const fmtNaira = (n) => {
  const val = Number(n || 0);
  return "₦" + val.toLocaleString("en-NG", { maximumFractionDigits: 0 });
};

const roundAmount = (n) => {
  const v = Number(n || 0);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
};

const getContribution = (member) => {
  if (!member) return 0;
  const candidates = [
    "amount",
    "plan_amount",
    "savings_amount",
    "contribution_amount",
    "amount_per_month",
    "monthly_amount",
    "amount_per_period",
    "daily_amount",
    "amount_per_day",
  ];
  for (const k of candidates) {
    if (member[k] !== undefined && member[k] !== null && member[k] !== "") {
      const n = parseFloat(member[k]);
      if (Number.isFinite(n) && n > 0) return roundAmount(n);
    }
  }
  return 0;
};

// ────────────────────────────────────────────────────────────
// Rotation pool card
// ────────────────────────────────────────────────────────────
const RotationPoolCard = ({
  title,
  durationKey,
  amountPerMonth,
  eligibleMembers,
  onShuffle,
  slots,
  isShuffled,
  onReset,
  collectedSet,
  onToggleCollected,
}) => {
  const durationMonths = durationToMonths(durationKey);
  const eligibleCount = eligibleMembers.length;
  const monthlyPot = amountPerMonth * eligibleCount;

  const filledCount = slots.filter((s) => s.member).length;
  const collectedCount = slots.filter(
    (s) => s.member && collectedSet.has(String(s.member.id)),
  ).length;
  const firstUnfilledIndex = slots.findIndex((s) => !s.member);

  return (
    <div className="rs-card" style={{ padding: 20 }}>
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
              flexWrap: "wrap",
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
              {durationMonths} months
            </span>
          </div>
          <div
            style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
          >
            <strong style={{ color: "var(--credit)" }}>{eligibleCount}</strong>{" "}
            eligible ·{" "}
            <strong style={{ color: "var(--info)" }}>{filledCount}</strong>{" "}
            assigned ·{" "}
            <strong style={{ color: "var(--warning)" }}>
              {collectedCount}
            </strong>{" "}
            collected
            {eligibleCount < durationMonths && (
              <>
                {" · "}
                <span style={{ color: "var(--warning)" }}>
                  {durationMonths - eligibleCount} empty slots
                </span>
              </>
            )}
          </div>
          {amountPerMonth > 0 && eligibleCount > 0 && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(37,99,235,0.10)",
                  color: "var(--info)",
                  border: "1px solid rgba(37,99,235,0.30)",
                }}
              >
                💵 {fmtNaira(amountPerMonth)}/month per member
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.10)",
                  color: "var(--credit)",
                  border: "1px solid rgba(16,185,129,0.30)",
                  fontWeight: 700,
                }}
              >
                🎁 Monthly pot: {fmtNaira(monthlyPot)}
              </span>
            </div>
          )}
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
              whiteSpace: "nowrap",
            }}
          >
            🎲 Shuffle Months
          </button>
          {isShuffled && (
            <button
              type="button"
              onClick={onReset}
              title="Clear all assignments and collected marks"
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

      {slots.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          Click <strong>🎲 Shuffle Months</strong> to assign one member per
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
                <th style={{ width: 80 }}>Month</th>
                <th>Recipient</th>
                <th>Account</th>
                <th style={{ textAlign: "right" }}>Receives</th>
                <th style={{ textAlign: "center", width: 130 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const m = slot.member;
                const isEmpty = !m;
                const isNext = slot.month === firstUnfilledIndex + 1;
                const collected = m && collectedSet.has(String(m.id));
                return (
                  <tr
                    key={slot.month}
                    style={{
                      opacity: isEmpty ? 0.55 : 1,
                      background: isNext
                        ? "rgba(59,130,246,0.06)"
                        : collected
                          ? "rgba(16,185,129,0.06)"
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
                              background: collected
                                ? "rgba(16,185,129,0.25)"
                                : "rgba(16,185,129,0.15)",
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
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>
                              {m.name || "—"}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Contributes {fmtNaira(getContribution(m))}/mo
                            </div>
                          </div>
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
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isEmpty ? "—" : fmtNaira(monthlyPot)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isEmpty ? (
                        <span
                          style={{ color: "var(--text-dim)", fontSize: 12 }}
                        >
                          —
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleCollected(m.id)}
                          title={
                            collected
                              ? "Click to mark as NOT collected"
                              : "Click to mark as collected"
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 10px",
                            borderRadius: 20,
                            border: collected
                              ? "1px solid rgba(16,185,129,0.5)"
                              : "1px solid var(--border)",
                            background: collected
                              ? "rgba(16,185,129,0.15)"
                              : "transparent",
                            color: collected
                              ? "var(--credit)"
                              : "var(--text-muted)",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                            cursor: "pointer",
                          }}
                        >
                          {collected ? "✅ Collected" : "○ Mark Collected"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {slots.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <span>Payout progress</span>
            <span style={{ fontWeight: 700, color: "var(--credit)" }}>
              {collectedCount} / {filledCount} received
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              background: "rgba(15,23,42,0.08)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${
                  filledCount > 0 ? (collectedCount / filledCount) * 100 : 0
                }%`,
                background: "linear-gradient(90deg, #059669, #10b981)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Accordion for one amount group
// ────────────────────────────────────────────────────────────
const AmountGroupAccordion = ({
  amount,
  membersCount,
  sixMonthEligible,
  oneYearEligible,
  sixMonthSlots,
  sixMonthAssigned,
  sixMonthCollected,
  oneYearSlots,
  oneYearAssigned,
  oneYearCollected,
  onShuffleSixMonth,
  onResetSixMonth,
  onToggleCollectedSixMonth,
  onShuffleOneYear,
  onResetOneYear,
  onToggleCollectedOneYear,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const totalCollected = sixMonthCollected.size + oneYearCollected.size;
  const totalAssigned =
    sixMonthSlots.filter((s) => s.member).length +
    oneYearSlots.filter((s) => s.member).length;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          textAlign: "left",
          color: "var(--text)",
          borderBottom: open ? "1px solid var(--border)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 24 }}>{open ? "📂" : "📁"}</span>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              💵 {fmtNaira(amount)}/month
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  background: "rgba(37,99,235,0.15)",
                  color: "var(--info)",
                  border: "1px solid rgba(37,99,235,0.35)",
                }}
              >
                {membersCount} member{membersCount === 1 ? "" : "s"}
              </span>
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              {sixMonthEligible.length} in 6-month · {oneYearEligible.length} in
              1-year · {totalAssigned} assigned · {totalCollected} collected
            </div>
          </div>
        </div>
        <span style={{ fontSize: 18, color: "var(--text-muted)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{ padding: 20 }}>
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
            amountPerMonth={amount}
            eligibleMembers={sixMonthEligible}
            slots={sixMonthSlots}
            isShuffled={sixMonthAssigned}
            onShuffle={onShuffleSixMonth}
            onReset={onResetSixMonth}
            collectedSet={sixMonthCollected}
            onToggleCollected={onToggleCollectedSixMonth}
          />

          <RotationPoolCard
            title="💵 Cash · 1 Year"
            durationKey="1 year"
            amountPerMonth={amount}
            eligibleMembers={oneYearEligible}
            slots={oneYearSlots}
            isShuffled={oneYearAssigned}
            onShuffle={onShuffleOneYear}
            onReset={onResetOneYear}
            collectedSet={oneYearCollected}
            onToggleCollected={onToggleCollectedOneYear}
          />
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main Reshuffle
// ────────────────────────────────────────────────────────────
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

  const [fallbackBranch, setFallbackBranch] = useState(null);

  useEffect(() => {
    if (activeBranch?.name || !branchId) {
      setFallbackBranch(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await callApi(`/api/get-branch.php?id=${branchId}`);
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

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [displayMembers, setDisplayMembers] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const originalMembersRef = useRef([]);

  const [groups, setGroups] = useState({});

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = branchId
        ? `/api/members.php?branch_id=${branchId}`
        : `/api/members.php`;
      const data = await callApi(url);
      const list = Array.isArray(data?.members)
        ? data.members
        : Array.isArray(data?.data?.members)
          ? data.data.members
          : [];
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

  // Stable signature of the current member set
  const membersSignature = useMemo(
    () =>
      members
        .map((m) => String(m.id))
        .sort()
        .join("|"),
    [members],
  );

  // Only reset display + groups when the member *identities* change,
  // not on every refresh with the same ids.
  useEffect(() => {
    originalMembersRef.current = members;
    setDisplayMembers(members);
    setIsShuffled(false);
    // groups are reset only if the member set actually changed
    setGroups((prev) => {
      const next = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersSignature]);

  useEffect(() => {
    setPage(1);
    // do NOT clear isShuffled on search — the shuffle order is still valid
  }, [searchTerm]);

  const groupedByAmount = useMemo(() => {
    const buckets = new Map();
    members.forEach((m) => {
      const method = String(m.savings_method || "").toLowerCase();
      if (method !== "cash") return;
      const amt = getContribution(m);
      if (!amt || amt <= 0) return;
      const key = String(roundAmount(amt));
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(m);
    });
    return Array.from(buckets.entries())
      .map(([amount, list]) => ({ amount: Number(amount), list }))
      .sort((a, b) => a.amount - b.amount);
  }, [members]);

  const eligibilityByAmount = useMemo(() => {
    const map = new Map();
    groupedByAmount.forEach(({ amount, list }) => {
      const sixMonth = getEligibleForDuration(list, "6 months");
      const sixIds = new Set(sixMonth.map((m) => String(m.id)));
      // Prevent double-assignment to the same amount group across both durations
      const oneYearBase = getEligibleForDuration(list, "1 year");
      const oneYear = oneYearBase.filter((m) => !sixIds.has(String(m.id)));
      map.set(String(amount), { sixMonth, oneYear });
    });
    return map;
  }, [groupedByAmount]);

  // Initialise group state — no wholesale reset of existing groups
  useEffect(() => {
    setGroups((prev) => {
      const next = { ...prev };
      groupedByAmount.forEach(({ amount }) => {
        const key = String(amount);
        if (!next[key]) {
          next[key] = {
            sixMonthSlots: [],
            sixMonthAssigned: false,
            sixMonthCollected: new Set(),
            oneYearSlots: [],
            oneYearAssigned: false,
            oneYearCollected: new Set(),
          };
        }
      });
      return next;
    });
  }, [groupedByAmount]);

  // Rehydrate rotations + collected sets from localStorage once per
  // (members, groups) snapshot so shuffles survive a page reload.
  useEffect(() => {
    if (members.length === 0 || groupedByAmount.length === 0) return;

    const membersById = new Map(members.map((m) => [String(m.id), m]));
    const all = readAllRotations();
    if (!all || Object.keys(all).length === 0) return;

    setGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      groupedByAmount.forEach(({ amount }) => {
        const key = String(amount);
        const current = next[key];
        if (!current) return;

        const sixKey = `6 months::${Math.round(amount)}`;
        const yearKey = `1 year::${Math.round(amount)}`;

        if (all[sixKey] && !current.sixMonthAssigned) {
          const slots = rehydrateSlots(all[sixKey], membersById);
          const hasFilled = slots.some((s) => s.member);
          if (hasFilled) {
            next[key] = {
              ...current,
              sixMonthSlots: slots,
              sixMonthAssigned: true,
              sixMonthCollected: new Set(
                (all[sixKey].collected || []).map(String),
              ),
            };
            changed = true;
          }
        }

        if (all[yearKey] && !current.oneYearAssigned) {
          const slots = rehydrateSlots(all[yearKey], membersById);
          const hasFilled = slots.some((s) => s.member);
          if (hasFilled) {
            next[key] = {
              ...next[key],
              oneYearSlots: slots,
              oneYearAssigned: true,
              oneYearCollected: new Set(
                (all[yearKey].collected || []).map(String),
              ),
            };
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [members, groupedByAmount]);

  const updateGroup = (amount, patch) => {
    const key = String(amount);
    setGroups((prev) => {
      const cur = prev[key] || {
        sixMonthSlots: [],
        sixMonthAssigned: false,
        sixMonthCollected: new Set(),
        oneYearSlots: [],
        oneYearAssigned: false,
        oneYearCollected: new Set(),
      };
      return { ...prev, [key]: { ...cur, ...patch } };
    });
  };

  const handleShuffleSixMonth = (amount, eligible) => {
    const slots = buildMonthlyRotation(eligible, 6);
    const collected = new Set();
    updateGroup(amount, {
      sixMonthSlots: slots,
      sixMonthAssigned: true,
      sixMonthCollected: collected,
    });
    persistRotation("6 months", amount, slots, collected);
  };
  const handleResetSixMonth = (amount) => {
    updateGroup(amount, {
      sixMonthSlots: [],
      sixMonthAssigned: false,
      sixMonthCollected: new Set(),
    });
    clearPersistedRotation("6 months", amount);
  };
  const toggleCollectedSixMonth = (amount, memberId) => {
    const key = String(amount);
    setGroups((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const next = new Set(cur.sixMonthCollected);
      const idStr = String(memberId);
      if (next.has(idStr)) next.delete(idStr);
      else next.add(idStr);
      persistCollected("6 months", amount, cur.sixMonthSlots, next);
      return {
        ...prev,
        [key]: { ...cur, sixMonthCollected: next },
      };
    });
  };

  const handleShuffleOneYear = (amount, eligible) => {
    const slots = buildMonthlyRotation(eligible, 12);
    const collected = new Set();
    updateGroup(amount, {
      oneYearSlots: slots,
      oneYearAssigned: true,
      oneYearCollected: collected,
    });
    persistRotation("1 year", amount, slots, collected);
  };
  const handleResetOneYear = (amount) => {
    updateGroup(amount, {
      oneYearSlots: [],
      oneYearAssigned: false,
      oneYearCollected: new Set(),
    });
    clearPersistedRotation("1 year", amount);
  };
  const toggleCollectedOneYear = (amount, memberId) => {
    const key = String(amount);
    setGroups((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const next = new Set(cur.oneYearCollected);
      const idStr = String(memberId);
      if (next.has(idStr)) next.delete(idStr);
      else next.add(idStr);
      persistCollected("1 year", amount, cur.oneYearSlots, next);
      return {
        ...prev,
        [key]: { ...cur, oneYearCollected: next },
      };
    });
  };

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
        .rs-card { background-color: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .rs-table { width: 100%; border-collapse: collapse; }
        .rs-table th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .rs-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); vertical-align: middle; }
        .rs-table tr:hover { background-color: var(--bg-surface-2); }
        .rs-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 0; flex-wrap: wrap; }
        .rs-page-btn { min-width: 36px; height: 36px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .rs-page-btn:hover:not(:disabled):not(.active) { background: var(--bg-surface-2); }
        .rs-page-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
        .rs-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

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
            Members grouped by monthly contribution. Assign one member per month
            per group. Tick ✅ when a member has received their payout.
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
            <div style={{ fontSize: 15, fontWeight: 700 }}>{branchName}</div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
            >
              {branchCode !== "—" ? `Code: ${branchCode}` : "—"} ·{" "}
              <strong style={{ color: "var(--credit)" }}>
                {members.length}
              </strong>{" "}
              members ·{" "}
              <strong style={{ color: "var(--info)" }}>
                {groupedByAmount.length}
              </strong>{" "}
              amount group{groupedByAmount.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
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
        💰 Cash Payout Rotation — grouped by monthly amount
      </div>

      {loading ? (
        <div
          className="rs-card"
          style={{ textAlign: "center", color: "var(--text-muted)" }}
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
          <div>Loading groups…</div>
        </div>
      ) : groupedByAmount.length === 0 ? (
        <div
          className="rs-card"
          style={{ textAlign: "center", color: "var(--text-muted)" }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          No Cash-plan members found in this branch.
        </div>
      ) : (
        groupedByAmount.map(({ amount, list }) => {
          const key = String(amount);
          const groupState = groups[key] || {
            sixMonthSlots: [],
            sixMonthAssigned: false,
            sixMonthCollected: new Set(),
            oneYearSlots: [],
            oneYearAssigned: false,
            oneYearCollected: new Set(),
          };
          const elig = eligibilityByAmount.get(key) || {
            sixMonth: [],
            oneYear: [],
          };

          return (
            <AmountGroupAccordion
              key={key}
              amount={amount}
              membersCount={list.length}
              sixMonthEligible={elig.sixMonth}
              oneYearEligible={elig.oneYear}
              sixMonthSlots={groupState.sixMonthSlots}
              sixMonthAssigned={groupState.sixMonthAssigned}
              sixMonthCollected={groupState.sixMonthCollected}
              oneYearSlots={groupState.oneYearSlots}
              oneYearAssigned={groupState.oneYearAssigned}
              oneYearCollected={groupState.oneYearCollected}
              onShuffleSixMonth={() =>
                handleShuffleSixMonth(amount, elig.sixMonth)
              }
              onResetSixMonth={() => handleResetSixMonth(amount)}
              onToggleCollectedSixMonth={(id) =>
                toggleCollectedSixMonth(amount, id)
              }
              onShuffleOneYear={() =>
                handleShuffleOneYear(amount, elig.oneYear)
              }
              onResetOneYear={() => handleResetOneYear(amount)}
              onToggleCollectedOneYear={(id) =>
                toggleCollectedOneYear(amount, id)
              }
              defaultOpen={
                groupedByAmount.length === 1 ||
                amount === groupedByAmount[0].amount
              }
            />
          );
        })
      )}

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
