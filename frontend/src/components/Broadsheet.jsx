// src/components/Broadsheet.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";

import useSpeechRecognition from "../hooks/useSpeechRecognition";
import MemberDetailModal from "./MemberDetailModal";

const API_BASE_URL = "http://localhost:8000";

const MONTHS = [
  { value: "", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const Broadsheet = () => {
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMember, setFilterMember] = useState("all");

  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const formatCurrency = (amt) => {
    const num = parseFloat(amt) || 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMemberName = useCallback(
    (memberId) => {
      if (!memberId) return "Unknown";
      const m = members.find((x) => Number(x.id) === Number(memberId));
      return m ? m.name : "Unknown";
    },
    [members],
  );

  const cleanDescription = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/\s*\(ID:\s*\d+\)/gi, "")
      .replace(/\s*\(ID\s*\d+\)/gi, "")
      .trim();
  };

  const calculateAndNormalize = (rawTxns) => {
    return rawTxns.map((t) => {
      const type = (t.type || "").toLowerCase();
      let category = "transaction";

      if (type === "deposit" || type === "contribution") {
        category = "credit";
      } else if (type === "withdrawal" || type === "charge" || type === "fee") {
        category = "debit";
      } else if (type === "transfer") {
        category = t.direction === "in" ? "credit" : "debit";
      }

      const amount = parseFloat(t.amount) || 0;
      const charge = parseFloat(t.charge) || 0;
      const net =
        t.net_amount !== undefined && t.net_amount !== null
          ? parseFloat(t.net_amount)
          : amount;

      return {
        ...t,
        type,
        category,
        amount,
        charge,
        net,
        description: cleanDescription(t.description),
      };
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const mRes = await fetch(`${API_BASE_URL}/api/members.php`);
      const mData = await mRes.json();
      let membersList = [];
      if (mData.members) {
        membersList = mData.members;
        setMembers(membersList);
      }

      const tRes = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const tData = await tRes.json();

      let all = [];
      if (Array.isArray(tData.transactions)) {
        all = [...tData.transactions];
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.role === "member" || u.role === "user") {
          all = all.filter((t) => Number(t.memberId) === Number(u.id));
        }
      }

      all.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setTransactions(calculateAndNormalize(all));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load broadsheet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceResult = useCallback(
    (spokenText) => {
      if (!spokenText) return;
      const cleaned = spokenText.toLowerCase().trim();
      setSearchTerm(cleaned);

      let matches = members.filter((m) =>
        m.name?.toLowerCase().includes(cleaned),
      );

      if (matches.length === 0) {
        const words = cleaned.split(/\s+/).filter(Boolean);
        matches = members.filter((m) =>
          words.some((w) => m.name?.toLowerCase().includes(w)),
        );
      }

      if (matches.length > 0) {
        setSelectedMember(matches[0]);
        setShowMemberModal(true);
        toast.success(
          matches.length === 1
            ? `👤 Found: ${matches[0].name}`
            : `Found ${matches.length} matches — showing ${matches[0].name}`,
        );
      } else {
        toast.error(`No member found matching "${spokenText}"`);
      }
    },
    [members],
  );

  const {
    isListening,
    transcript,
    isSupported: voiceSupported,
    toggleListening,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: (err) => {
      if (err !== "aborted" && err !== "no-speech") {
        toast.error(`🎙️ Mic error: ${err}`);
      }
    },
  });

  useEffect(() => {
    console.log("🎙️ Voice supported:", voiceSupported);
    console.log(
      "SpeechRecognition available:",
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
    console.log("Protocol:", window.location.protocol);
    console.log("Host:", window.location.host);
  }, [voiceSupported]);

  const filtered = useMemo(() => {
    let list = [...transactions];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((t) => {
        const name = (
          t.memberName ||
          getMemberName(t.memberId) ||
          ""
        ).toLowerCase();
        return (
          name.includes(term) ||
          String(t.accountNumber || "").includes(term) ||
          String(t.description || "")
            .toLowerCase()
            .includes(term) ||
          String(t.id || "").includes(term) ||
          String(t.type || "")
            .toLowerCase()
            .includes(term)
        );
      });
    }

    if (filterType !== "all") {
      list = list.filter((t) => t.type === filterType);
    }

    if (filterStatus !== "all") {
      list = list.filter((t) => t.status === filterStatus);
    }

    if (filterMember !== "all") {
      list = list.filter((t) => Number(t.memberId) === Number(filterMember));
    }

    list = list.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;

      if (filterDay) {
        const dayStr = d.toISOString().split("T")[0];
        if (dayStr !== filterDay) return false;
      }
      if (filterMonth) {
        const m = String(d.getMonth() + 1).padStart(2, "0");
        if (m !== filterMonth) return false;
      }
      if (filterYear) {
        if (String(d.getFullYear()) !== String(filterYear)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let ca, cb;
      if (sortBy === "amount") {
        ca = a.amount;
        cb = b.amount;
      } else if (sortBy === "charge") {
        ca = a.charge;
        cb = b.charge;
      } else if (sortBy === "date") {
        ca = new Date(a.date).getTime() || 0;
        cb = new Date(b.date).getTime() || 0;
      } else if (sortBy === "id") {
        ca = parseInt(a.id) || 0;
        cb = parseInt(b.id) || 0;
      } else {
        ca = String(a[sortBy] || "").toLowerCase();
        cb = String(b[sortBy] || "").toLowerCase();
      }
      if (ca < cb) return sortOrder === "asc" ? -1 : 1;
      if (ca > cb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [
    transactions,
    searchTerm,
    filterType,
    filterStatus,
    filterMember,
    filterDay,
    filterMonth,
    filterYear,
    sortBy,
    sortOrder,
    getMemberName,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered.length]);

  const stats = useMemo(() => {
    const depositTypes = ["deposit", "contribution"];
    const debitTypes = ["withdrawal"];

    const totalCredits = filtered
      .filter((t) => depositTypes.includes(t.type))
      .reduce((s, t) => s + t.amount, 0);

    const totalDebits = filtered
      .filter((t) => debitTypes.includes(t.type))
      .reduce((s, t) => s + t.amount, 0);

    const totalTransfers = filtered
      .filter((t) => t.type === "transfer")
      .reduce((s, t) => s + t.amount, 0);

    const totalCharges = filtered.reduce(
      (s, t) => s + (parseFloat(t.charge) || 0),
      0,
    );

    return {
      totalCredits,
      totalDebits,
      totalTransfers,
      totalCharges,
      netFlow: totalCredits - totalDebits,
      count: filtered.length,
    };
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const typeBadge = (type) => {
    const map = {
      deposit: {
        bg: "rgba(16,185,129,0.2)",
        color: "var(--credit)",
        icon: "💰",
      },
      contribution: {
        bg: "rgba(59,130,246,0.2)",
        color: "var(--info)",
        icon: "🤝",
      },
      withdrawal: {
        bg: "rgba(239,68,68,0.2)",
        color: "var(--debit)",
        icon: "💸",
      },
      transfer: {
        bg: "rgba(139,92,246,0.2)",
        color: "var(--purple)",
        icon: "🔄",
      },
      charge: {
        bg: "rgba(234,179,8,0.2)",
        color: "var(--warning)",
        icon: "⚡",
      },
      fee: { bg: "rgba(234,179,8,0.2)", color: "var(--warning)", icon: "⚡" },
    };
    const s = map[type] || {
      bg: "rgba(148,163,184,0.2)",
      color: "var(--text)",
      icon: "📄",
    };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          background: s.bg,
          color: s.color,
        }}
      >
        {s.icon} {String(type || "").toUpperCase()}
      </span>
    );
  };

  const statusBadge = (status) => {
    const map = {
      pending: { bg: "rgba(234,179,8,0.2)", color: "var(--warning)" },
      approved: { bg: "rgba(16,185,129,0.2)", color: "var(--credit)" },
      rejected: { bg: "rgba(239,68,68,0.2)", color: "var(--debit)" },
    };
    const s = map[status] || {
      bg: "rgba(148,163,184,0.2)",
      color: "var(--text)",
    };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          background: s.bg,
          color: s.color,
        }}
      >
        {String(status || "n/a").toUpperCase()}
      </span>
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterMember("all");
    setFilterDay("");
    setFilterMonth("");
    setFilterYear("");
    setSortBy("date");
    setSortOrder("desc");
  };

  const exportCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Time",
      "Member",
      "Account No.",
      "Type",
      "Category",
      "Amount",
      "Charge",
      "Net",
      "Status",
      "Description",
    ];
    const rows = filtered.map((t) => [
      t.id,
      formatDate(t.date),
      formatTime(t.date),
      t.memberName || getMemberName(t.memberId),
      t.accountNumber || "",
      t.type,
      t.category,
      t.amount,
      t.charge,
      t.net,
      t.status,
      (t.description || "").replace(/,/g, ";"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `broadsheet_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 Broadsheet exported!");
  };

  const printBroadsheet = () => {
    window.print();
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text)",
          fontSize: "20px",
        }}
      >
        ⏳ Loading broadsheet...
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        maxWidth: "1400px",
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ===== SCOPED STYLES ===== */}
      <style>{`
        .bs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .bs-header h2 { margin: 0; font-size: 24px; font-weight: 700; color: var(--text); }
        .bs-header p { margin: 4px 0 0; color: var(--text-muted); font-size: 14px; }
        .bs-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .bs-btn {
          padding: 8px 16px; border-radius: 6px;
          border: 1px solid transparent; font-size: 13px;
          font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .bs-btn-blue { background: rgba(59,130,246,0.15); color: var(--info); border-color: rgba(59,130,246,0.25); }
        .bs-btn-blue:hover { background: rgba(59,130,246,0.25); }
        .bs-btn-red { background: rgba(239,68,68,0.15); color: var(--debit); border-color: rgba(239,68,68,0.25); }
        .bs-btn-red:hover { background: rgba(239,68,68,0.25); }
        .bs-btn-green { background: rgba(16,185,129,0.15); color: var(--credit); border-color: rgba(16,185,129,0.25); }
        .bs-btn-green:hover { background: rgba(16,185,129,0.25); }
        .bs-btn-purple { background: rgba(139,92,246,0.15); color: var(--purple); border-color: rgba(139,92,246,0.25); }
        .bs-btn-purple:hover { background: rgba(139,92,246,0.25); }

        .bs-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px; margin-bottom: 20px;
        }
        .bs-stat-card {
          background: var(--bg-surface-2);
          border: 1px solid var(--border);
          border-radius: 12px; padding: 16px;
          display: flex; flex-direction: column; gap: 6px;
          transition: all 0.2s;
        }
        .bs-stat-card:hover { transform: translateY(-2px); border-color: var(--border-strong); }
        .bs-stat-label { color: var(--text-muted); font-size: 12px; font-weight: 500; }
        .bs-stat-value { font-size: 20px; font-weight: 700; }
        .bs-green { color: var(--credit); }
        .bs-red { color: var(--debit); }
        .bs-purple { color: var(--purple); }
        .bs-yellow { color: var(--warning); }
        .bs-blue { color: var(--info); }

        .bs-filter-bar {
          background: var(--bg-surface-2);
          border: 1px solid var(--border);
          border-radius: 12px; padding: 16px; margin-bottom: 20px;
        }
        .bs-filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }
        .bs-input, .bs-select {
          background: var(--bg-surface); color: var(--text);
          padding: 9px 12px; border-radius: 6px;
          border: 1px solid var(--border);
          outline: none; font-size: 13px; width: 100%;
          box-sizing: border-box; transition: border-color 0.2s;
        }
        .bs-input:focus, .bs-select:focus { border-color: var(--accent); }
        .bs-input::placeholder { color: var(--text-dim); }
        .bs-select option { background: var(--bg-surface); color: var(--text); }
        .bs-filter-summary { margin-top: 12px; color: var(--text-muted); font-size: 13px; }
        .bs-filter-summary strong { color: var(--text); }

        .bs-search-wrap {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .bs-search-wrap .bs-input { flex: 1; }
        .bs-mic-btn {
          padding: 9px 14px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          border: 1px solid rgba(16,185,129,0.3);
          background: rgba(16,185,129,0.15);
          color: var(--credit);
        }
        .bs-mic-btn:hover { background: rgba(16,185,129,0.25); }
        .bs-mic-btn.listening {
          border-color: var(--debit);
          background: rgba(239,68,68,0.25);
          color: var(--debit);
          animation: bs-pulse 1.2s infinite;
        }
        @keyframes bs-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        .bs-mic-btn.unsupported {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: var(--border);
          background: var(--bg-surface-2);
          color: var(--text-muted);
        }
        .bs-mic-btn.unsupported:hover {
          background: var(--bg-surface-2);
        }

        .bs-table-wrap {
          background: var(--bg-surface-2);
          border: 1px solid var(--border);
          border-radius: 12px; overflow: auto; max-height: 600px;
        }
        .bs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bs-table thead th {
          position: sticky; top: 0; z-index: 2;
          background: var(--bg-surface); color: var(--text);
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
          padding: 12px 14px; text-align: left;
          white-space: nowrap;
          border-bottom: 1px solid var(--border);
        }
        .bs-table tbody td {
          padding: 11px 14px;
          border-top: 1px solid var(--border);
          color: var(--text); vertical-align: middle;
        }
        .bs-table tbody tr:hover { background: var(--bg-hover); }
        .bs-mono { font-family: "SF Mono","Monaco",monospace; font-size: 12px; color: var(--text-muted); }
        .bs-muted { color: var(--text-muted); font-size: 12px; }
        .bs-right { text-align: right; }
        .bs-amount { font-weight: 600; font-size: 14px; white-space: nowrap; }
        .bs-amount-credit { color: var(--credit); }
        .bs-amount-debit { color: var(--debit); }
        .bs-charge { color: var(--warning); font-weight: 600; white-space: nowrap; }
        .bs-net { color: var(--credit); font-weight: 600; white-space: nowrap; }
        .bs-desc { color: var(--text); font-size: 12px; max-width: 260px; }
        .bs-table tfoot td {
          background: var(--bg-surface-2);
          padding: 12px 14px; font-size: 13px;
          border-top: 2px solid var(--border-strong);
          color: var(--text);
        }

        .bs-empty { text-align: center; padding: 50px 20px !important; color: var(--text-muted); }
        .bs-empty-icon { font-size: 48px; margin-bottom: 8px; }
        .bs-empty-hint { font-size: 12px; color: var(--text-dim); margin-top: 4px; }

        .bs-pagination {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 16px; flex-wrap: wrap; gap: 12px;
        }
        .bs-page-info { color: var(--text-muted); font-size: 13px; }
        .bs-page-controls { display: flex; gap: 6px; flex-wrap: wrap; }
        .bs-page-btn {
          padding: 6px 12px; border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent; color: var(--text);
          cursor: pointer; font-size: 13px; transition: all 0.2s;
        }
        .bs-page-btn:hover:not(:disabled) { background: var(--bg-hover); }
        .bs-page-btn.active {
          background: rgba(16,185,129,0.2);
          border-color: var(--accent); color: var(--credit);
        }
        .bs-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div className="bs-header">
        <div>
          <h2>📑 Financial Broadsheet</h2>
          <p>
            {user?.role === "admin"
              ? "All members — complete transaction ledger"
              : "Your complete transaction ledger"}
          </p>
        </div>
        <div className="bs-actions">
          <button onClick={fetchData} className="bs-btn bs-btn-blue">
            🔄 Refresh
          </button>
          <button onClick={resetFilters} className="bs-btn bs-btn-red">
            🧹 Reset
          </button>
          <button onClick={exportCSV} className="bs-btn bs-btn-green">
            📥 Export CSV
          </button>
          <button onClick={printBroadsheet} className="bs-btn bs-btn-purple">
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bs-stats">
        <div className="bs-stat-card">
          <span className="bs-stat-label">💰 Total Credits</span>
          <span className="bs-stat-value bs-green">
            {formatCurrency(stats.totalCredits)}
          </span>
        </div>
        <div className="bs-stat-card">
          <span className="bs-stat-label">💸 Total Debits</span>
          <span className="bs-stat-value bs-red">
            {formatCurrency(stats.totalDebits)}
          </span>
        </div>
        <div className="bs-stat-card">
          <span className="bs-stat-label">🔄 Transfers</span>
          <span className="bs-stat-value bs-purple">
            {formatCurrency(stats.totalTransfers)}
          </span>
        </div>
        <div className="bs-stat-card">
          <span className="bs-stat-label">⚡ Total Charges</span>
          <span className="bs-stat-value bs-yellow">
            {formatCurrency(stats.totalCharges)}
          </span>
        </div>
        <div className="bs-stat-card">
          <span className="bs-stat-label">📊 Net Flow</span>
          <span
            className={`bs-stat-value ${
              stats.netFlow >= 0 ? "bs-green" : "bs-red"
            }`}
          >
            {formatCurrency(stats.netFlow)}
          </span>
        </div>
        <div className="bs-stat-card">
          <span className="bs-stat-label">📄 Records</span>
          <span className="bs-stat-value bs-blue">{stats.count}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bs-filter-bar">
        <div className="bs-filter-grid">
          <div className="bs-search-wrap">
            <input
              className="bs-input"
              type="text"
              placeholder={
                isListening
                  ? `🎙️ Listening... ${transcript || ""}`
                  : "🔍 Search name, account, ID, description..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (!voiceSupported) {
                  toast.error(
                    "🎙️ Voice not supported. Use Chrome/Edge/Safari on localhost or HTTPS.",
                  );
                  return;
                }
                toggleListening();
              }}
              className={`bs-mic-btn ${isListening ? "listening" : ""} ${
                !voiceSupported ? "unsupported" : ""
              }`}
              title={
                !voiceSupported
                  ? "Voice not supported in this browser/context"
                  : isListening
                    ? "Stop listening"
                    : "Speak a name to search & show details"
              }
            >
              {isListening ? "🔴 Stop" : voiceSupported ? "🎙️ Voice" : "🎙️ N/A"}
            </button>
          </div>

          <select
            className="bs-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">📋 All Types</option>
            <option value="deposit">💰 Deposit</option>
            <option value="withdrawal">💸 Withdrawal</option>
            <option value="transfer">🔄 Transfer</option>
            <option value="contribution">🤝 Contribution</option>
          </select>

          <select
            className="bs-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">📊 All Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>

          {user?.role === "admin" && (
            <select
              className="bs-select"
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
            >
              <option value="all">👥 All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          <input
            className="bs-input"
            type="date"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            title="Filter by exact day"
          />

          <select
            className="bs-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                📅 {m.label}
              </option>
            ))}
          </select>

          <select
            className="bs-select"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">📆 All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className="bs-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-");
              setSortBy(sb);
              setSortOrder(so);
            }}
          >
            <option value="date-desc">📅 Newest First</option>
            <option value="date-asc">📅 Oldest First</option>
            <option value="amount-desc">💰 Highest Amount</option>
            <option value="amount-asc">💰 Lowest Amount</option>
            <option value="charge-desc">⚡ Highest Charge</option>
            <option value="charge-asc">⚡ Lowest Charge</option>
            <option value="id-desc">🔢 Newest ID</option>
            <option value="id-asc">🔢 Oldest ID</option>
          </select>
        </div>

        <div className="bs-filter-summary">
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{transactions.length}</strong> transactions
          {filterDay && ` on ${filterDay}`}
          {filterMonth &&
            ` in ${MONTHS.find((m) => m.value === filterMonth)?.label}`}
          {filterYear && ` ${filterYear}`}
        </div>
      </div>

      {/* Table */}
      <div className="bs-table-wrap">
        <table className="bs-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Time</th>
              <th>Member</th>
              <th>Account</th>
              <th>Type</th>
              <th className="bs-right">Amount</th>
              <th className="bs-right">Charge</th>
              <th className="bs-right">Net</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="11" className="bs-empty">
                  <div className="bs-empty-icon">📭</div>
                  <p>No transactions match your filters</p>
                  <p className="bs-empty-hint">
                    Try clearing the date, month, or year filters
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map((t, idx) => {
                const isDebit =
                  t.category === "debit" || t.type === "withdrawal";
                return (
                  <tr key={t.id}>
                    <td className="bs-mono">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td>{formatDate(t.date)}</td>
                    <td className="bs-muted">{formatTime(t.date) || "—"}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text)" }}>
                        {t.memberName || getMemberName(t.memberId)}
                      </div>
                      {t.accountNumber && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-dim)",
                            marginTop: "2px",
                          }}
                        >
                          {t.accountNumber}
                        </div>
                      )}
                    </td>
                    <td className="bs-mono bs-muted">
                      {t.accountNumber || "—"}
                    </td>
                    <td>{typeBadge(t.type)}</td>
                    <td
                      className={`bs-right bs-amount ${
                        isDebit ? "bs-amount-debit" : "bs-amount-credit"
                      }`}
                    >
                      {isDebit ? "-" : "+"}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="bs-right bs-charge">
                      {t.charge > 0 ? `−${formatCurrency(t.charge)}` : "—"}
                    </td>
                    <td className="bs-right bs-net">{formatCurrency(t.net)}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td className="bs-desc">{t.description || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {paginated.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="6" className="bs-right">
                  <strong>Page Totals</strong>
                </td>
                <td className="bs-right bs-amount">
                  {formatCurrency(
                    paginated.reduce((s, t) => {
                      const isDebit =
                        t.category === "debit" || t.type === "withdrawal";
                      return s + (isDebit ? -t.amount : t.amount);
                    }, 0),
                  )}
                </td>
                <td className="bs-right bs-charge">
                  {formatCurrency(
                    paginated.reduce((s, t) => s + (t.charge || 0), 0),
                  )}
                </td>
                <td className="bs-right bs-net">
                  {formatCurrency(
                    paginated.reduce((s, t) => s + (t.net || 0), 0),
                  )}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="bs-pagination">
          <div className="bs-page-info">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
            {filtered.length}
          </div>
          <div className="bs-page-controls">
            <button
              className="bs-page-btn"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              ←
            </button>
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              let num;
              if (totalPages <= 7) num = i + 1;
              else if (currentPage <= 4) num = i + 1;
              else if (currentPage >= totalPages - 3) num = totalPages - 6 + i;
              else num = currentPage - 3 + i;
              return (
                <button
                  key={i}
                  className={`bs-page-btn ${
                    currentPage === num ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              );
            })}
            <button
              className="bs-page-btn"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {showMemberModal && selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          transactions={transactions}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onClose={() => {
            setShowMemberModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

export default Broadsheet;
