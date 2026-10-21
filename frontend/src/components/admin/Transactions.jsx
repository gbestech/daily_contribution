// src/components/admin/AdminTransactions.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";

// ------------------------------------------------------------
// Unwrap a branch out of several possible API response shapes.
// ------------------------------------------------------------
const pickBranchFromResponse = (data, id) => {
  if (!data || typeof data !== "object") return null;

  const lists = [data?.branches, data?.data?.branches, data?.data, data];
  for (const l of lists) {
    if (Array.isArray(l) && id != null) {
      const found = l.find((b) => String(b?.id) === String(id));
      if (found) return found;
    }
  }

  const candidates = [data?.branch, data?.data?.branch, data?.data, data];
  for (const c of candidates) {
    if (
      c &&
      typeof c === "object" &&
      !Array.isArray(c) &&
      (c.name || c.branch_name)
    )
      return c;
  }
  return null;
};

const firstText = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).trim();
  }
  return "";
};

// ------------------------------------------------------------
// Resolve branch id — context → saved selection → user → URL
// ------------------------------------------------------------
const resolveBranchId = (ctxBranchId) => {
  if (ctxBranchId !== undefined && ctxBranchId !== null) {
    const s = String(ctxBranchId).trim();
    if (s !== "") return ctxBranchId;
  }
  try {
    const saved = localStorage.getItem("selectedBranchId");
    if (saved && String(saved).trim() !== "") return saved;
  } catch {}
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    if (stored?.branch_id !== undefined && stored?.branch_id !== null)
      return stored.branch_id;
    if (stored?.branchId !== undefined && stored?.branchId !== null)
      return stored.branchId;
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("branch");
    if (raw) {
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? num : raw;
    }
  } catch {}
  return null;
};

// ------------------------------------------------------------
// NEW: call apiFetch and normalise to { ok, status, data, raw }.
// Works whether apiFetch returns a Response or parsed JSON.
// ------------------------------------------------------------
const callApi = async (url, options) => {
  let res;
  try {
    res = await apiFetch(url, options);
  } catch (err) {
    // apiFetch itself threw (network, CORS, TLS, etc.)
    console.error(`[api] ${url} → network error:`, err);
    return {
      ok: false,
      status: 0,
      data: null,
      raw: "",
      error: err?.message || "Network error",
    };
  }

  // Case A — apiFetch returned a Response-like object
  if (res && typeof res === "object" && "ok" in res && "status" in res) {
    const status = res.status;
    const ok = !!res.ok;
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
      console.warn(`[api] ${url} → failed reading body:`, err);
    }
    if (!ok) {
      console.error(
        `[api] ${url} → HTTP ${status}`,
        "\nbody:",
        data ?? text?.slice(0, 500),
      );
    }
    return { ok, status, data, raw: text };
  }

  // Case B — apiFetch already returned parsed JSON
  const status = res?.status_code ?? res?.code ?? (res?.status ? 200 : 200);
  const ok =
    res?.success === false
      ? false
      : res?.error
        ? false
        : res?.status === false
          ? false
          : true;

  if (!ok) {
    console.error(`[api] ${url} → API error payload:`, res);
  }
  return { ok, status, data: res, raw: "" };
};

const buildSlipSrc = (t) => {
  if (!t?.payment_slip) return "";
  let s = String(t.payment_slip).trim().replace(/\s/g, "");
  if (s.startsWith("data:")) return s;

  const mime =
    t.payment_slip_type ||
    (s.startsWith("/9j/")
      ? "image/jpeg"
      : s.startsWith("iVBOR")
        ? "image/png"
        : s.startsWith("R0lGO")
          ? "image/gif"
          : s.startsWith("UklGR")
            ? "image/webp"
            : "image/jpeg");

  return `data:${mime};base64,${s}`;
};

const isSlipImage = (t) => {
  const type = t?.payment_slip_type || "";
  if (type.startsWith("image/")) return true;
  if (type === "application/pdf") return false;

  const s = (t?.payment_slip || "").replace(/\s/g, "");
  if (s.startsWith("data:image/")) return true;
  if (s.startsWith("data:application/pdf")) return false;
  if (s.startsWith("/9j/")) return true;
  if (s.startsWith("iVBOR")) return true;
  if (s.startsWith("R0lGO")) return true;
  if (s.startsWith("UklGR")) return true;
  if (s.startsWith("JVBER")) return false;
  return true;
};

const resolveCustomerName = (t) =>
  t.memberName ||
  t.member_name ||
  t.customer_name ||
  (t.member && (t.member.name || t.member.full_name)) ||
  (t.member_id ? `Member #${t.member_id}` : "") ||
  "Walk-in Customer";

const resolveCustomerPhone = (t) =>
  t.memberPhone ||
  t.member_phone ||
  t.phone ||
  (t.member && t.member.phone) ||
  "";

const AdminTransactions = () => {
  const branchCtx = useBranch() || {};
  const ctxBranch = branchCtx.activeBranch || branchCtx.selectedBranch || null;
  const branches = Array.isArray(branchCtx.branches) ? branchCtx.branches : [];
  const ctxBranchId = branchCtx.activeBranchId ?? ctxBranch?.id ?? null;

  const chooseBranch = useCallback(
    (id) => {
      const branchObj =
        branches.find((b) => String(b.id) === String(id)) || null;
      if (typeof branchCtx.setActiveBranchId === "function") {
        branchCtx.setActiveBranchId(id);
      } else if (typeof branchCtx.setSelectedBranch === "function") {
        branchCtx.setSelectedBranch(branchObj || { id });
      } else if (typeof branchCtx.switchBranch === "function") {
        branchCtx.switchBranch(branchObj || { id });
      } else if (typeof branchCtx.selectBranch === "function") {
        branchCtx.selectBranch(branchObj || { id });
      } else {
        console.warn("[AdminTransactions] BranchContext has no branch setter");
      }
    },
    [branchCtx, branches],
  );

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    total_amount: 0,
    deposits: 0,
    withdrawals: 0,
    pending: 0,
    completed: 0,
  });

  const [branchMeta, setBranchMeta] = useState(null);
  const refreshLockRef = useRef(false);

  const resolvedBranchId = useMemo(
    () => resolveBranchId(ctxBranchId),
    [ctxBranchId],
  );

  // ------------------------------------------------------------
  // Branch meta — uses callApi so we see real errors
  // ------------------------------------------------------------
  const fetchBranchMeta = useCallback(async (branchId) => {
    if (branchId === null || branchId === undefined || branchId === "") {
      setBranchMeta(null);
      return null;
    }

    const r1 = await callApi(
      `/api/get-branch.php?id=${encodeURIComponent(branchId)}`,
    );
    if (r1.ok) {
      const b = pickBranchFromResponse(r1.data, branchId);
      console.log(
        "[AdminTransactions] get-branch.php →",
        r1.data,
        "picked:",
        b,
      );
      if (b) {
        setBranchMeta(b);
        return b;
      }
    }

    const r2 = await callApi(`/api/branches.php`);
    if (r2.ok) {
      const b = pickBranchFromResponse(r2.data, branchId);
      console.log("[AdminTransactions] branches.php picked:", b);
      if (b) {
        setBranchMeta(b);
        return b;
      }
    }

    setBranchMeta(null);
    return null;
  }, []);

  useEffect(() => {
    fetchBranchMeta(resolvedBranchId);
  }, [resolvedBranchId, fetchBranchMeta]);

  // ------------------------------------------------------------
  // Transactions — tolerant to both apiFetch shapes
  // ------------------------------------------------------------
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const branchId = resolvedBranchId;
      if (branchId === null || branchId === undefined) {
        setTransactions([]);
        setStats({
          total: 0,
          total_amount: 0,
          deposits: 0,
          withdrawals: 0,
          pending: 0,
          completed: 0,
        });
        setLoading(false);
        return;
      }

      const url = `/api/transactions.php?branch_id=${encodeURIComponent(branchId)}`;
      const { ok, status, data: result, error } = await callApi(url);

      if (!ok) {
        const detail =
          result?.error ||
          result?.message ||
          (status ? `HTTP ${status}` : "") ||
          error ||
          "Unknown error";
        toast.error(`Failed to fetch transactions — ${detail}`);
        setTransactions([]);
        return;
      }

      let data = [];
      if (Array.isArray(result)) data = result;
      else if (Array.isArray(result?.transactions)) data = result.transactions;
      else if (Array.isArray(result?.data)) data = result.data;
      else if (Array.isArray(result?.data?.transactions))
        data = result.data.transactions;

      const branchStr = String(branchId);
      const branchFiltered = data.filter((t) => {
        const rowBranch = t.branch_id ?? t.branchId;
        if (rowBranch === undefined || rowBranch === null) return true;
        return String(rowBranch) === branchStr;
      });

      const formattedData = branchFiltered.map((t) => ({
        id: t.id,
        type: t.type || "deposit",
        amount: parseFloat(t.amount) || 0,
        charge: parseFloat(t.charge || 0),
        rate: parseFloat(t.rate || 0),
        net_amount: parseFloat(t.net_amount || t.amount || 0),
        status: t.status || "pending",
        customer_name: resolveCustomerName(t),
        customer_phone: resolveCustomerPhone(t),
        description: t.description || "",
        reference: t.reference || `TRX-${String(t.id).padStart(6, "0")}`,
        transaction_id: t.id,
        created_at: t.date || t.created_at || new Date().toISOString(),
        payment_method: t.payment_method || "cash",
        invoice_number: t.invoice_number || "",
        receipt_path: t.receipt_path || null,
        memberId: t.memberId ?? t.member_id ?? null,
        accountNumber: t.accountNumber || t.account_number || "",
        memberName: t.memberName || t.member_name || null,

        payment_slip: t.payment_slip || null,
        payment_slip_name: t.payment_slip_name || null,
        payment_slip_type: t.payment_slip_type || null,

        rejection_reason: t.rejection_reason || null,
        rejected_by: t.rejected_by || null,
        rejected_at: t.rejected_at || null,
        approved_at: t.approved_at || null,
        branch_id: t.branch_id ?? t.branchId ?? branchId,
      }));

      setTransactions(formattedData);

      const totalAmount = formattedData.reduce(
        (s, t) => s + (parseFloat(t.amount) || 0),
        0,
      );
      const deposits = formattedData.filter(
        (t) => t.type === "deposit" || t.type === "credit",
      ).length;
      const withdrawals = formattedData.filter(
        (t) => t.type === "withdrawal" || t.type === "debit",
      ).length;
      const pending = formattedData.filter(
        (t) => t.status === "pending",
      ).length;
      const completed = formattedData.filter(
        (t) => t.status === "completed" || t.status === "approved",
      ).length;

      setStats({
        total: formattedData.length,
        total_amount: totalAmount,
        deposits,
        withdrawals,
        pending,
        completed,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error(`Failed to fetch transactions — ${error.message || "error"}`);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedBranchId]);

  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedBranchId]);

  const handleRefresh = async () => {
    if (refreshLockRef.current) return;
    refreshLockRef.current = true;
    setRefreshing(true);
    try {
      await Promise.all([
        fetchBranchMeta(resolvedBranchId),
        fetchTransactions(),
      ]);
      toast.success("✅ Refreshed");
    } catch (err) {
      console.error("[AdminTransactions] refresh failed:", err);
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
      refreshLockRef.current = false;
    }
  };

  const withBranch = (path) => {
    if (resolvedBranchId === null || resolvedBranchId === undefined) {
      return path;
    }
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}branch_id=${encodeURIComponent(resolvedBranchId)}`;
  };

  const handleApproveTransaction = async (transactionId) => {
    try {
      const url = withBranch(`/api/transactions.php/${transactionId}/approve`);
      const { ok, data } = await callApi(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (ok) {
        toast.success("✅ Transaction approved!");
        fetchTransactions();
      } else {
        toast.error(
          data?.error || data?.message || "Failed to approve transaction",
        );
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast.error("Failed to approve transaction");
    }
  };

  const openRejectModal = (transactionId) => {
    setRejectingId(transactionId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const adminName =
        JSON.parse(localStorage.getItem("user") || "{}")?.name || "Admin";

      const url = withBranch(`/api/transactions.php/${rejectingId}/reject`);
      const { ok, data } = await callApi(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason.trim(),
          rejected_by: adminName,
          branch_id: resolvedBranchId,
        }),
      });

      if (ok) {
        toast.success("✅ Transaction rejected!");
        setShowRejectModal(false);
        setRejectReason("");
        setRejectingId(null);
        setShowDetailsModal(false);
        setSelectedTransaction(null);
        fetchTransactions();
      } else {
        toast.error(
          data?.error || data?.message || "Failed to reject transaction",
        );
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast.error("Failed to reject transaction");
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

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: "💰",
      withdrawal: "🏦",
      payment: "💳",
      refund: "↩️",
      fee: "📊",
      transfer: "🔄",
      credit: "📈",
      debit: "📉",
    };
    return icons[type] || "💳";
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = transactions.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const filteredTransactions = () => {
    if (!searchTerm.trim()) return currentTransactions;
    const term = searchTerm.toLowerCase().trim();
    return currentTransactions.filter((t) => {
      return (
        (t.customer_name && t.customer_name.toLowerCase().includes(term)) ||
        (t.customer_phone && String(t.customer_phone).includes(term)) ||
        (t.reference && t.reference.toLowerCase().includes(term)) ||
        (t.invoice_number && t.invoice_number.toLowerCase().includes(term)) ||
        (t.transaction_id && t.transaction_id.toString().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    });
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const renderPaymentSlip = (t) => {
    if (!t?.payment_slip) return null;

    const src = buildSlipSrc(t);
    const isImg = isSlipImage(t);

    return (
      <div style={{ gridColumn: "1 / -1" }}>
        <div className="detail-label" style={{ marginBottom: "6px" }}>
          📎 Payment Slip
          {t.payment_slip_name && (
            <span
              style={{
                color: "var(--text-dim)",
                fontWeight: "400",
                marginLeft: "6px",
              }}
            >
              ({t.payment_slip_name})
            </span>
          )}
        </div>

        {isImg ? (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "transparent",
              textAlign: "center",
            }}
          >
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              title="Click to view full size"
            >
              <img
                src={src}
                alt="Payment slip"
                onError={(e) => {
                  console.error("[slip] failed to render. Length:", src.length);
                  e.target.style.display = "none";
                }}
                style={{
                  maxWidth: "100%",
                  maxHeight: "320px",
                  display: "block",
                  margin: "0 auto",
                  cursor: "zoom-in",
                }}
              />
            </a>
            <div
              style={{
                padding: "6px",
                fontSize: "11px",
                color: "var(--text-muted)",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              Click image to open in new tab
            </div>

            <a
              href={src}
              download={t.payment_slip_name || `slip-${t.id}.jpg`}
              style={{
                display: "inline-block",
                margin: "8px",
                padding: "6px 12px",
                fontSize: "12px",
                color: "var(--info)",
                textDecoration: "underline",
              }}
            >
              ⬇ Or download the file
            </a>
          </div>
        ) : (
          <a
            href={src}
            download={t.payment_slip_name || `slip-${t.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(96,165,250,0.3)",
              backgroundColor: "transparent",
              color: "var(--info)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            <span style={{ fontSize: "20px" }}>📄</span>
            <span style={{ flex: 1 }}>
              {t.payment_slip_name || "Download payment slip"}
            </span>
            <span style={{ fontSize: "12px", opacity: 0.7 }}>Download ⬇</span>
          </a>
        )}
      </div>
    );
  };

  const branchFromList = useMemo(
    () =>
      branches.find((b) => String(b.id) === String(resolvedBranchId)) || null,
    [branches, resolvedBranchId],
  );

  const branchNameResolved = firstText(
    branchMeta?.name,
    branchMeta?.branch_name,
    ctxBranch?.name,
    ctxBranch?.branch_name,
    branchFromList?.name,
    branchFromList?.branch_name,
  );

  const branchName =
    branchNameResolved ||
    (resolvedBranchId !== null && resolvedBranchId !== undefined
      ? `Branch #${resolvedBranchId}`
      : "—");

  const branchCode =
    firstText(
      branchMeta?.code,
      branchMeta?.branch_code,
      ctxBranch?.code,
      branchFromList?.code,
    ) || "—";

  if (resolvedBranchId === null || resolvedBranchId === undefined) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh" }}>
        <div
          style={{
            maxWidth: 520,
            margin: "60px auto",
            padding: 24,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg-surface-2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 8,
              color: "var(--text)",
            }}
          >
            Select a branch
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            Choose the branch whose transactions you want to view.
          </p>

          {branches.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              No branches found. Make sure at least one branch exists.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => chooseBranch(b.id)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    <strong>{b.name}</strong>
                    {b.code && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          marginLeft: 8,
                          fontSize: 12,
                        }}
                      >
                        {b.code}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background:
                        b.status === "active"
                          ? "rgba(16,185,129,0.2)"
                          : "rgba(107,114,128,0.2)",
                      color:
                        b.status === "active"
                          ? "var(--credit)"
                          : "var(--text-muted)",
                    }}
                  >
                    {b.status || "active"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: "var(--text)",
          backgroundColor: "transparent",
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
            border: "4px solid rgba(255,255,255,0.1)",
            borderTopColor: "#00aa69",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // NOTE: everything below is identical to your original file.
  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        backgroundColor: "transparent",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .transaction-table { width: 100%; border-collapse: collapse; border: none; background: transparent; }
        .transaction-table thead { background: transparent; }
        .transaction-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border: none; }
        .transaction-table td { padding: 12px 16px; border: none; color: var(--text); }
        .transaction-table tbody tr { border: none; background: transparent; transition: background-color 0.15s ease; }
        .transaction-table tbody tr:hover { background-color: var(--bg-surface-2); }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
        .badge-completed, .badge-approved { background-color: rgba(16,185,129,0.2); color: var(--credit); border: 1px solid rgba(16,185,129,0.3); }
        .badge-pending { background-color: rgba(234,179,8,0.2); color: var(--warning); border: 1px solid rgba(234,179,8,0.3); }
        .badge-failed, .badge-rejected { background-color: rgba(239,68,68,0.2); color: var(--debit); border: 1px solid rgba(239,68,68,0.3); }
        .badge-cancelled { background-color: rgba(107,114,128,0.2); color: var(--text-muted); border: 1px solid rgba(107,114,128,0.3); }
        .badge-processing { background-color: rgba(59,130,246,0.2); color: var(--info); border: 1px solid rgba(59,130,246,0.3); }
        .type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase; }
        .type-deposit, .type-credit { background-color: rgba(16,185,129,0.15); color: var(--credit); }
        .type-withdrawal, .type-debit { background-color: rgba(239,68,68,0.15); color: var(--debit); }
        .type-payment { background-color: rgba(59,130,246,0.15); color: var(--info); }
        .type-refund { background-color: rgba(234,179,8,0.15); color: var(--warning); }
        .type-fee { background-color: rgba(168,85,247,0.15); color: var(--purple); }
        .type-transfer { background-color: rgba(99,102,241,0.15); color: #818cf8; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .stat-card { background-color: transparent; border: none; border-bottom: 1px solid var(--border); border-radius: 0; padding: 8px 0 12px 0; }
        .stat-label { font-size: 12px; color: var(--text-muted); }
        .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
        .search-input { width: 100%; padding: 10px 0; border-radius: 0; border: none; border-bottom: 1px solid var(--border); background-color: transparent; color: var(--text); font-size: 14px; outline: none; transition: border-color 0.2s; margin-bottom: 20px; box-sizing: border-box; }
        .search-input:focus { border-bottom-color: var(--accent); }
        .search-input::placeholder { color: var(--text-dim); }
        .pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px solid var(--border); margin-top: 4px; flex-wrap: wrap; gap: 8px; }
        .pagination-info { font-size: 13px; color: var(--text-muted); }
        .pagination-buttons { display: flex; gap: 4px; flex-wrap: wrap; }
        .page-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .page-btn:hover:not(:disabled) { background-color: var(--bg-surface-2); color: var(--text); }
        .page-btn.active { background-color: var(--accent); border-color: var(--accent); color: white; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }
        .empty-icon { font-size: 48px; margin-bottom: 8px; }
        .modal-overlay { position: fixed; inset: 0; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 16px; }
        .modal-content { background-color: var(--bg-surface); border-radius: 16px; padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .modal-title { font-size: 18px; font-weight: bold; }
        .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; font-size: 24px; }
        .modal-close:hover { color: var(--text); }
        .detail-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
        .detail-label { font-size: 11px; color: var(--text-muted); }
        .detail-value { font-weight: 500; }
        .btn-close { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        .btn-close:hover { background: var(--bg-surface-2); }
        .slip-indicator { display: inline-flex; align-items: center; justify-content: center; margin-left: 6px; padding: 1px 5px; border-radius: 4px; background: rgba(96,165,250,0.15); color: var(--info); font-size: 10px; }
        .refresh-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent; color: var(--text-muted);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        }
        .refresh-btn:hover:not(:disabled) { color: var(--credit); border-color: var(--credit); }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .refresh-btn .spin { display: inline-block; animation: spin 1s linear infinite; }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .detail-row { grid-template-columns: 1fr; }
          .pagination { flex-direction: column; align-items: center; }
        }
      `}</style>

      {/* ---- everything from here down is unchanged ---- */}
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
              {branchName}
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              {branchCode} · Transactions for this branch ·{" "}
              <strong style={{ color: "var(--credit)" }}>
                {transactions.length}
              </strong>{" "}
              records
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh transactions and branch info"
          >
            <span className={refreshing ? "spin" : ""}>⟳</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          {branches.length > 1 && (
            <select
              value={String(resolvedBranchId)}
              onChange={(e) => {
                const id = e.target.value;
                if (id) chooseBranch(id);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-surface-2)",
                color: "var(--text)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `· ${b.code}` : ""}
                </option>
              ))}
            </select>
          )}

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
      </div>

      <h2
        style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}
      >
        💰 All Transactions
      </h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value" style={{ color: "var(--text)" }}>
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
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>
            {stats.pending}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: "var(--info)" }}>
            {stats.completed}
          </div>
        </div>
      </div>

      <input
        type="text"
        className="search-input"
        placeholder="Search by customer, phone, reference, invoice..."
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
          <span style={{ color: "var(--credit)", fontWeight: "600" }}>
            {filteredTransactions().length}
          </span>{" "}
          transaction{filteredTransactions().length !== 1 ? "s" : ""}
        </div>
      )}

      <div style={{ background: "transparent" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions().length > 0 ? (
                filteredTransactions().map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>
                          {getTransactionIcon(t.type)}
                        </span>
                        <span className={`type-badge type-${t.type}`}>
                          {t.type}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "500" }}>
                          {t.customer_name || "Walk-in Customer"}
                          {t.payment_slip && (
                            <span
                              className="slip-indicator"
                              title="Payment slip attached"
                            >
                              📎 slip
                            </span>
                          )}
                        </div>
                        {t.customer_phone && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {t.customer_phone}
                          </div>
                        )}
                        {t.memberId && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-dim)",
                            }}
                          >
                            ID #{t.memberId}
                            {t.accountNumber ? ` · ${t.accountNumber}` : ""}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color:
                            t.type === "deposit" || t.type === "credit"
                              ? "var(--credit)"
                              : "var(--debit)",
                        }}
                      >
                        {formatNaira(t.amount)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{ fontSize: "13px", color: "var(--text-muted)" }}
                      >
                        {formatDate(t.created_at)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--info)",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background =
                            "rgba(96, 165, 250, 0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                        onClick={() => viewTransactionDetails(t)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-icon">💳</div>
                      <p style={{ fontSize: "16px", fontWeight: "500" }}>
                        {searchTerm
                          ? "No transactions found"
                          : `No transactions in ${branchName} yet`}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "var(--text-dim)",
                          marginTop: "4px",
                        }}
                      >
                        {searchTerm
                          ? `No transactions matching "${searchTerm}"`
                          : "Transactions will appear here once recorded"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {transactions.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, transactions.length)} of{" "}
              <span style={{ fontWeight: "600", color: "var(--text)" }}>
                {transactions.length}
              </span>{" "}
              entries
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
                    className={`page-btn ${currentPage === pageNumber ? "active" : ""}`}
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

      {showDetailsModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Transaction Details</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
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
                {getTransactionIcon(selectedTransaction.type)}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "var(--credit)",
                  }}
                >
                  {formatNaira(selectedTransaction.amount)}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <span
                    className={`type-badge type-${selectedTransaction.type}`}
                  >
                    {selectedTransaction.type}
                  </span>
                  <span className={`badge badge-${selectedTransaction.status}`}>
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-row">
              <div>
                <div className="detail-label">Transaction ID</div>
                <div className="detail-value">#{selectedTransaction.id}</div>
              </div>
              <div>
                <div className="detail-label">Date</div>
                <div className="detail-value">
                  {formatDate(selectedTransaction.created_at)}
                </div>
              </div>
              <div>
                <div className="detail-label">Customer</div>
                <div className="detail-value">
                  {selectedTransaction.customer_name || "Walk-in Customer"}
                </div>
              </div>
              <div>
                <div className="detail-label">Phone</div>
                <div className="detail-value">
                  {selectedTransaction.customer_phone || "N/A"}
                </div>
              </div>
              {selectedTransaction.memberId && (
                <div>
                  <div className="detail-label">Member ID</div>
                  <div className="detail-value">
                    #{selectedTransaction.memberId}
                  </div>
                </div>
              )}
              <div>
                <div className="detail-label">Payment Method</div>
                <div
                  className="detail-value"
                  style={{ textTransform: "capitalize" }}
                >
                  {selectedTransaction.payment_method || "N/A"}
                </div>
              </div>
              <div>
                <div className="detail-label">Reference</div>
                <div
                  className="detail-value"
                  style={{ fontFamily: "monospace", fontSize: "13px" }}
                >
                  {selectedTransaction.reference || "N/A"}
                </div>
              </div>
              {selectedTransaction.invoice_number && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Invoice Number</div>
                  <div className="detail-value">
                    {selectedTransaction.invoice_number}
                  </div>
                </div>
              )}
              {selectedTransaction.description && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Description</div>
                  <div className="detail-value">
                    {selectedTransaction.description}
                  </div>
                </div>
              )}
              {selectedTransaction.accountNumber && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Account Number</div>
                  <div
                    className="detail-value"
                    style={{ fontFamily: "monospace" }}
                  >
                    {selectedTransaction.accountNumber}
                  </div>
                </div>
              )}

              {selectedTransaction.type === "deposit" &&
                selectedTransaction.charge > 0 && (
                  <>
                    <div>
                      <div className="detail-label">Charge</div>
                      <div
                        className="detail-value"
                        style={{ color: "var(--warning)" }}
                      >
                        {formatNaira(selectedTransaction.charge)}
                      </div>
                    </div>
                    <div>
                      <div className="detail-label">Net Amount</div>
                      <div
                        className="detail-value"
                        style={{ color: "var(--credit)" }}
                      >
                        {formatNaira(selectedTransaction.net_amount)}
                      </div>
                    </div>
                  </>
                )}

              {selectedTransaction.status === "rejected" &&
                selectedTransaction.rejection_reason && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div className="detail-label">Rejection Reason</div>
                    <div
                      style={{
                        marginTop: "4px",
                        padding: "10px 12px",
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: "8px",
                        color: "#fca5a5",
                        fontSize: "13px",
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedTransaction.rejection_reason}
                      {(selectedTransaction.rejected_by ||
                        selectedTransaction.rejected_at) && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {selectedTransaction.rejected_by && (
                            <>By: {selectedTransaction.rejected_by}</>
                          )}
                          {selectedTransaction.rejected_by &&
                            selectedTransaction.rejected_at &&
                            " • "}
                          {selectedTransaction.rejected_at && (
                            <>{formatDate(selectedTransaction.rejected_at)}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {renderPaymentSlip(selectedTransaction)}
            </div>

            {selectedTransaction.status === "pending" && (
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
                  onClick={() => {
                    handleApproveTransaction(selectedTransaction.id);
                    setShowDetailsModal(false);
                    setSelectedTransaction(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--accent)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#059669")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "var(--accent)")
                  }
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => openRejectModal(selectedTransaction.id)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--debit)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#dc2626")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "var(--debit)")
                  }
                >
                  ❌ Reject
                </button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop:
                  selectedTransaction.status === "pending" ? "8px" : "16px",
                paddingTop:
                  selectedTransaction.status === "pending" ? "0" : "16px",
                borderTop:
                  selectedTransaction.status === "pending"
                    ? "none"
                    : "1px solid var(--border)",
              }}
            >
              <button
                className="btn-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--debit)" }}>
                ❌ Reject Transaction
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setRejectingId(null);
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                marginBottom: "16px",
                marginTop: 0,
              }}
            >
              Please provide a reason for rejecting this transaction. The member
              will see this reason.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Payment slip is unclear / Amount doesn't match / Duplicate entry"
              rows={4}
              autoFocus
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--text)",
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />

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
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setRejectingId(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: rejectReason.trim()
                    ? "var(--debit)"
                    : "var(--text-dim)",
                  color: "var(--text)",
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                  fontSize: "13px",
                  fontWeight: "500",
                  opacity: rejectReason.trim() ? 1 : 0.6,
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
