// src/components/admin/AdminMembers.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "https://baleeg.onrender.com";

// ============================================================
// Helpers
// ============================================================
const formatCurrency = (amount) => {
  const n = parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const resolveMemberBranchId = (member, fallbackBranchId) => {
  if (member) {
    const b = member.branch_id ?? member.branchId;
    if (b !== undefined && b !== null && String(b).trim() !== "") return b;
  }
  return fallbackBranchId ?? null;
};

// ============================================================
// Member details modal — fully branch-scoped
// ============================================================
const MemberDetailsModal = ({ member, branchId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const memberBranchId = useMemo(
    () => resolveMemberBranchId(member, branchId),
    [member, branchId],
  );

  const loadAll = useCallback(async () => {
    if (!member?.id) {
      setLoadError("No member provided");
      setLoading(false);
      return;
    }
    if (!memberBranchId) {
      setLoadError(
        "This member has no branch assigned. Ask an admin to set their branch first.",
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      // 1. Branch name
      try {
        const br = await apiFetch(
          `/api/get-branch.php?id=${encodeURIComponent(memberBranchId)}`,
        );
        const brData = await br.json();
        const branch =
          brData?.branch || brData?.data?.branch || brData?.data || null;
        setBranchInfo(branch);
      } catch (e) {
        console.warn("[MemberDetails] branch fetch failed:", e);
      }

      // 2. Profile — try single-member endpoint first, then list
      let prof = null;
      try {
        const res = await apiFetch(
          `/api/members.php/${member.id}?branch_id=${encodeURIComponent(memberBranchId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          prof = data?.member || data?.data?.member || data?.data || null;
        }
      } catch {
        /* endpoint may not exist — fall through */
      }

      if (!prof) {
        const listRes = await apiFetch(
          `/api/members.php?branch_id=${encodeURIComponent(memberBranchId)}`,
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const arr = Array.isArray(listData?.members)
            ? listData.members
            : Array.isArray(listData?.data)
              ? listData.data
              : [];
          prof = arr.find((m) => String(m.id) === String(member.id)) || null;
        }
      }

      if (!prof) {
        setLoadError(
          `This member could not be found in branch #${memberBranchId}. They may have been moved or deleted.`,
        );
        setLoading(false);
        return;
      }

      setProfile(prof);

      // 3. Transactions — scoped to member's branch, filtered by member id
      try {
        const txRes = await apiFetch(
          `/api/transactions.php?branch_id=${encodeURIComponent(memberBranchId)}&limit=500`,
        );
        if (txRes.ok) {
          const txData = await txRes.json();
          const all = Array.isArray(txData?.transactions)
            ? txData.transactions
            : Array.isArray(txData?.data)
              ? txData.data
              : [];
          setTransactions(
            all.filter(
              (t) => String(t.memberId ?? t.member_id) === String(member.id),
            ),
          );
        }
      } catch (e) {
        console.warn("[MemberDetails] transactions fetch failed:", e);
      }

      // 4. Loans (optional — skip if endpoint is missing)
      try {
        const loanRes = await apiFetch(
          `/api/loans.php?branch_id=${encodeURIComponent(memberBranchId)}&member_id=${encodeURIComponent(member.id)}`,
        );
        if (loanRes.ok) {
          const loanData = await loanRes.json();
          const all = Array.isArray(loanData?.loans)
            ? loanData.loans
            : Array.isArray(loanData?.data)
              ? loanData.data
              : [];
          setLoans(
            all.filter(
              (l) => String(l.member_id ?? l.memberId) === String(member.id),
            ),
          );
        }
      } catch {
        /* no loans endpoint */
      }
    } catch (err) {
      console.error("[MemberDetails] load failed:", err);
      setLoadError(err.message || "Failed to load member details");
    } finally {
      setLoading(false);
    }
  }, [member?.id, memberBranchId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Derived stats from scoped transactions
  const stats = useMemo(() => {
    const deposits = transactions
      .filter((t) => t.type === "deposit" || t.type === "credit")
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const withdrawals = transactions
      .filter((t) => t.type === "withdrawal" || t.type === "debit")
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const transfersOut = transactions
      .filter((t) => t.type === "transfer")
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const charges = transactions.reduce(
      (s, t) => s + (parseFloat(t.charge) || 0),
      0,
    );
    return {
      deposits,
      withdrawals,
      transfersOut,
      charges,
      net: deposits - withdrawals - transfersOut - charges,
    };
  }, [transactions]);

  const plan = useMemo(() => {
    if (!profile) return null;
    const planName = profile.savings_plan || profile.savingsPlan || "";
    const duration = profile.duration || "";
    const amount = parseFloat(profile.amount) || 0;
    const method = profile.savings_method || profile.savingsMethod || "";
    const itemName = profile.item_name || profile.itemName || "";

    const periodsPerMonth = { Daily: 30, Weekly: 4, Monthly: 1, Random: 1 };
    const durationMonths = {
      "6 months": 6,
      "1 year": 12,
      "2 years": 24,
      "3 years": 36,
      "4 years": 48,
    };
    const ppm = periodsPerMonth[planName] || 0;
    const months = durationMonths[duration] || 0;
    const totalPeriods = ppm && months ? ppm * months : null;
    const total = totalPeriods && amount ? totalPeriods * amount : null;
    return {
      name: planName,
      duration,
      amount,
      method,
      itemName,
      totalPeriods,
      total,
    };
  }, [profile]);

  const branchLabel = (() => {
    const name =
      branchInfo?.name || profile?.branch_name || member?.branch_name;
    const code =
      branchInfo?.code || profile?.branch_code || member?.branch_code;
    if (name && code) return `${name} · ${code}`;
    if (name) return name;
    if (code) return code;
    if (memberBranchId) return `Branch #${memberBranchId}`;
    return "Unassigned";
  })();

  const displayName =
    profile?.name || member?.name || member?.full_name || "Unknown";
  const displayEmail = profile?.email || member?.email || "";
  const displayPhone = profile?.phone || member?.phone || "";
  const displayAccount =
    profile?.accountNumber ||
    profile?.account_number ||
    member?.accountNumber ||
    member?.account_number ||
    "—";
  const displayMembership =
    profile?.membershipType ||
    profile?.membership_type ||
    member?.membershipType ||
    "Standard";
  const displayJoinDate =
    profile?.joinDate ||
    profile?.join_date ||
    member?.joinDate ||
    member?.join_date ||
    "";
  const displayStatus = profile?.status || member?.status || "Active";
  const displayBalance = parseFloat(profile?.balance ?? member?.balance ?? 0);

  const progressPercent =
    plan?.total && displayBalance > 0
      ? Math.min(100, Math.round((displayBalance / plan.total) * 1000) / 10)
      : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 16,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e293b",
          color: "#f1f5f9",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          width: "100%",
          maxWidth: 720,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px 26px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              Member Full Details
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#f1f5f9",
                wordBreak: "break-word",
              }}
            >
              {displayName}
            </h2>
            <div
              style={{
                margin: "6px 0 0 0",
                fontSize: 13,
                color: "#94a3b8",
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.35)",
                }}
              >
                🏢 {branchLabel}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.35)",
                }}
              >
                ● {displayStatus}
              </span>
              <span>{displayMembership} Member</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 24,
              lineHeight: 1,
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "40px 0",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                border: "3px solid rgba(255,255,255,0.15)",
                borderTopColor: "#34d399",
                borderRadius: "50%",
                animation: "mdspin 0.9s linear infinite",
              }}
            />
            <style>{`@keyframes mdspin { to { transform: rotate(360deg); } }`}</style>
            Loading member details…
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fca5a5",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            ⚠️ {loadError}
          </div>
        )}

        {/* Body */}
        {!loading && !loadError && profile && (
          <>
            {plan && plan.name && (
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: 16,
                  marginTop: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    margin: "0 0 12px 0",
                  }}
                >
                  💼 Savings Plan
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    marginBottom: 12,
                    background: "rgba(37,99,235,0.10)",
                    border: "1px solid rgba(59,130,246,0.30)",
                    color: "#93c5fd",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div>
                    <strong style={{ color: "#f1f5f9" }}>{plan.name}</strong>
                    {plan.duration && <> · {plan.duration}</>}
                    {plan.method && (
                      <>
                        {" "}
                        · {plan.method}
                        {plan.itemName ? ` (${plan.itemName})` : ""}
                      </>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  {[
                    { label: "Savings Plan", value: plan.name },
                    { label: "Savings Method", value: plan.method },
                    ...(plan.itemName
                      ? [{ label: "Item", value: plan.itemName }]
                      : []),
                    { label: "Duration", value: plan.duration },
                    {
                      label:
                        plan.name === "Daily"
                          ? "Amount per Day"
                          : plan.name === "Weekly"
                            ? "Amount per Week"
                            : plan.name === "Monthly"
                              ? "Amount per Month"
                              : "Amount per Period",
                      value: formatCurrency(plan.amount),
                      accent: true,
                    },
                    ...(plan.totalPeriods
                      ? [
                          {
                            label: "Number of Payments",
                            value: plan.totalPeriods.toLocaleString(),
                          },
                        ]
                      : []),
                    ...(plan.total
                      ? [
                          {
                            label: "Total to Save",
                            value: formatCurrency(plan.total),
                            accent: true,
                          },
                        ]
                      : []),
                  ].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: c.accent ? "#34d399" : "#f1f5f9",
                          wordBreak: "break-word",
                        }}
                      >
                        {c.value || "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {plan.total && (
                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        fontSize: 12,
                        color: "#94a3b8",
                        marginTop: 6,
                      }}
                    >
                      <span>
                        Progress:{" "}
                        <strong style={{ color: "#f1f5f9" }}>
                          {formatCurrency(displayBalance)}
                        </strong>{" "}
                        of{" "}
                        <strong style={{ color: "#f1f5f9" }}>
                          {formatCurrency(plan.total)}
                        </strong>
                      </span>
                      <strong style={{ color: "#f1f5f9" }}>
                        {progressPercent}%
                      </strong>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 10,
                        borderRadius: 9999,
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 9999,
                          background:
                            "linear-gradient(90deg, #059669, #34d399)",
                          width: `${progressPercent}%`,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Personal info — with branch */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  margin: "0 0 12px 0",
                }}
              >
                📋 Personal Information
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  { label: "Full Name", value: displayName },
                  { label: "Email", value: displayEmail },
                  { label: "Phone", value: displayPhone },
                  {
                    label: "Account Number",
                    value: displayAccount,
                    mono: true,
                  },
                  { label: "Membership Type", value: displayMembership },
                  { label: "Join Date", value: formatDate(displayJoinDate) },
                  { label: "Status", value: displayStatus },
                ].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#f1f5f9",
                        wordBreak: "break-word",
                        fontFamily: c.mono ? "monospace" : undefined,
                      }}
                    >
                      {c.value || "—"}
                    </div>
                  </div>
                ))}

                {/* Branch cell — highlighted */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      color: "#64748b",
                      marginBottom: 4,
                    }}
                  >
                    Branch
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#34d399",
                      wordBreak: "break-word",
                    }}
                  >
                    {branchLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Savings & balance */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  margin: "0 0 12px 0",
                }}
              >
                💰 Savings & Balance
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  {
                    label: "Current Balance",
                    value: formatCurrency(displayBalance),
                    color: "#34d399",
                  },
                  {
                    label: "Total Deposits",
                    value: formatCurrency(stats.deposits),
                    color: "#34d399",
                  },
                  {
                    label: "Total Withdrawals",
                    value: formatCurrency(stats.withdrawals),
                    color: "#f87171",
                  },
                  {
                    label: "Transfers Out",
                    value: formatCurrency(stats.transfersOut),
                    color: "#a78bfa",
                  },
                  {
                    label: "Total Charges",
                    value: formatCurrency(stats.charges),
                    color: "#fbbf24",
                  },
                  {
                    label:
                      "Net Savings (Deposits − Withdrawals − Transfers − Charges)",
                    value: formatCurrency(stats.net),
                    color: "#34d399",
                    big: true,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: s.big ? 18 : 16,
                        fontWeight: 700,
                        color: s.color || "#f1f5f9",
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loans */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  margin: "0 0 12px 0",
                }}
              >
                🏦 Loan Summary
              </h3>
              {loans.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                    borderRadius: 10,
                    border: "1px dashed rgba(255,255,255,0.10)",
                  }}
                >
                  No loans on record
                </div>
              ) : (
                <div>
                  {loans.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#f1f5f9",
                          }}
                        >
                          Loan #{l.id} · {l.type || "Standard"}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "#94a3b8",
                            marginTop: 2,
                          }}
                        >
                          {l.description || "—"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            marginTop: 4,
                          }}
                        >
                          {formatDate(l.created_at || l.date)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(l.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 16,
                marginTop: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  margin: "0 0 12px 0",
                }}
              >
                📊 Transaction History ({transactions.length})
              </h3>
              {transactions.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                    borderRadius: 10,
                    border: "1px dashed rgba(255,255,255,0.10)",
                  }}
                >
                  No transactions on record
                </div>
              ) : (
                <div>
                  {transactions.slice(0, 20).map((t) => {
                    const isCredit =
                      t.type === "deposit" || t.type === "credit";
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#f1f5f9",
                              textTransform: "capitalize",
                            }}
                          >
                            {t.type || "transaction"}
                            {t.type === "transfer" && t.toMemberName
                              ? ` to ${t.toMemberName}`
                              : ""}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {t.description || "No description"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              marginTop: 4,
                            }}
                          >
                            {formatDate(t.date || t.created_at)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            color: isCredit ? "#34d399" : "#f87171",
                          }}
                        >
                          {isCredit ? "+" : "-"}
                          {formatCurrency(t.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f1f5f9",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// AdminMembers — parent page
// ============================================================
const AdminMembers = () => {
  const { activeBranchId, activeBranch } = useBranch();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  // ============================================================
  // Resolve branch id — context → user → localStorage
  // ============================================================
  const resolvedBranchId = useMemo(() => {
    const candidates = [activeBranchId, user?.branch_id, user?.branchId];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== "") return c;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored?.branch_id !== undefined && stored?.branch_id !== null)
        return stored.branch_id;
      if (stored?.branchId !== undefined && stored?.branchId !== null)
        return stored.branchId;
    } catch {}
    return null;
  }, [activeBranchId, user?.branch_id, user?.branchId]);

  // ============================================================
  // Fetch members — always with ?branch_id=
  // ============================================================
  const fetchMembers = useCallback(async () => {
    if (!resolvedBranchId) {
      // No branch — refuse to fetch, show empty list
      console.warn(
        "[AdminMembers] No branch id resolved — skipping fetch. Login must return branch_id.",
      );
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/members.php?branch_id=${encodeURIComponent(resolvedBranchId)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        console.error(
          "[AdminMembers] members fetch failed. Sent branch_id =",
          resolvedBranchId,
          "Response:",
          data,
        );
        setMembers([]);
        return;
      }

      const arr = Array.isArray(data?.members)
        ? data.members
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setMembers(arr);
    } catch (err) {
      console.error("[AdminMembers] fetch failed:", err);
      toast.error("Failed to load members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedBranchId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.phone || "").includes(term) ||
        String(m.accountNumber || m.account_number || "").includes(term),
    );
  }, [members, searchTerm]);

  return (
    <div
      style={{
        padding: 24,
        background: "#0f172a",
        color: "#f1f5f9",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>👥 Manage Members</h1>
        <p style={{ color: "#94a3b8", margin: "6px 0 0 0", fontSize: 14 }}>
          {activeBranch?.name
            ? `Showing members of ${activeBranch.name}${
                activeBranch.code ? ` (${activeBranch.code})` : ""
              }`
            : resolvedBranchId
              ? `Showing members of branch #${resolvedBranchId}`
              : "No branch selected"}
        </p>
      </div>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name, email, phone, account number…"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#0f172a",
          color: "#f1f5f9",
          fontSize: 14,
          outline: "none",
          marginBottom: 16,
        }}
      />

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
              {["Name", "Account", "Email", "Phone", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: "#94a3b8",
                      borderBottom: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 30,
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  Loading members…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 30,
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  {resolvedBranchId
                    ? searchTerm
                      ? "No members match your search"
                      : "No members in this branch yet"
                    : "No branch selected — login must return branch_id"}
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <td style={{ padding: "12px", fontWeight: 600 }}>
                    {m.name || m.full_name || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      color: "#94a3b8",
                      fontFamily: "monospace",
                    }}
                  >
                    {m.accountNumber || m.account_number || "—"}
                  </td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>
                    {m.email || "—"}
                  </td>
                  <td style={{ padding: "12px", color: "#94a3b8" }}>
                    {m.phone || "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: "rgba(16,185,129,0.15)",
                        color: "#34d399",
                        border: "1px solid rgba(16,185,129,0.35)",
                      }}
                    >
                      {m.status || "Active"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={() => setSelectedMember(m)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "1px solid rgba(59,130,246,0.35)",
                        background: "rgba(59,130,246,0.10)",
                        color: "#93c5fd",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedMember && (
        <MemberDetailsModal
          member={selectedMember}
          branchId={resolvedBranchId}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};

export default AdminMembers;
