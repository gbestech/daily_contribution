// src/components/member/Deposit.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";
const MAX_SLIP_SIZE_MB = 2;

// ------------------------------------------------------------
// Safe numeric parsing — rejects 0, "", null, NaN
// ------------------------------------------------------------
const toPositiveNumber = (val, fallback) => {
  if (val === null || val === undefined || val === "") return fallback;
  const cleaned = String(val).replace(/[₦,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const toNonNegativeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === "") return fallback;
  const cleaned = String(val).replace(/[₦,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// ------------------------------------------------------------
// Pull a balance out of any plausible API response shape
// ------------------------------------------------------------
const extractBalance = (obj) => {
  if (!obj || typeof obj !== "object") return undefined;

  const BALANCE_KEYS = [
    "balance",
    "current_balance",
    "currentBalance",
    "account_balance",
    "accountBalance",
    "total_balance",
    "totalBalance",
    "savings_balance",
    "savingsBalance",
    "wallet_balance",
    "walletBalance",
    "available_balance",
    "availableBalance",
    "funds",
    "wallet",
    "amount",
  ];

  for (const k of BALANCE_KEYS) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      const n = toNonNegativeNumber(obj[k], NaN);
      if (Number.isFinite(n)) return n;
    }
  }

  const WRAPPERS = ["member", "data", "user", "result", "payload", "record"];
  for (const w of WRAPPERS) {
    if (obj[w] && typeof obj[w] === "object") {
      const found = extractBalance(obj[w]);
      if (found !== undefined) return found;
    }
  }

  return undefined;
};

const MemberDeposit = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberBalance, setMemberBalance] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [user, setUser] = useState(null);

  // Payment slip state
  const [slipFile, setSlipFile] = useState(null); // File object
  const [slipPreview, setSlipPreview] = useState(""); // data URL for image preview
  const [slipBase64, setSlipBase64] = useState(""); // base64 payload to send
  const fileInputRef = useRef(null);

  const [settings, setSettings] = useState({
    min_deposit: 500,
    max_deposit: 50000,
    daily_limit: 100000,
    max_daily_deposits: 3,
    allow_multiple_deposits: true,
    default_contribution_amount: 5000,
    contribution_frequency: "daily",
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ============================================================
  // Apply settings safely
  // ============================================================
  const applySettings = (raw) => {
    if (!raw || typeof raw !== "object") return;

    const rawMin = toPositiveNumber(raw.min_deposit, NaN);
    const rawMax = toPositiveNumber(raw.max_deposit, NaN);
    const looksLikeKobo =
      Number.isFinite(rawMin) &&
      Number.isFinite(rawMax) &&
      rawMin >= 100000 &&
      rawMax >= 100000;
    const scale = looksLikeKobo ? 100 : 1;

    setSettings((prev) => {
      const min = toPositiveNumber(raw.min_deposit, prev.min_deposit) / scale;
      const max = toPositiveNumber(raw.max_deposit, prev.max_deposit) / scale;

      const safeMin = Math.max(1, min);
      const safeMax = Math.max(safeMin + 1, max);

      return {
        min_deposit: safeMin,
        max_deposit: safeMax,
        daily_limit:
          toPositiveNumber(raw.daily_limit, prev.daily_limit) / scale,
        max_daily_deposits: toNonNegativeNumber(
          raw.max_daily_deposits,
          prev.max_daily_deposits,
        ),
        allow_multiple_deposits:
          raw.allow_multiple_deposits !== undefined
            ? Boolean(raw.allow_multiple_deposits)
            : prev.allow_multiple_deposits,
        default_contribution_amount:
          toPositiveNumber(
            raw.default_contribution_amount,
            prev.default_contribution_amount,
          ) / scale,
        contribution_frequency:
          raw.contribution_frequency || prev.contribution_frequency,
      };
    });
  };

  // ============================================================
  // Load user + initial data
  // ============================================================
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.role === "member" || userData.role === "user") {
          setSelectedMember(userData.id);
          fetchMemberBalance(userData.id);
          fetchDailyTotal(userData.id);
        }
      } catch (e) {
        console.error("Bad user JSON in localStorage", e);
      }
    }
    fetchMembers();
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Fetch contribution settings
  // ============================================================
  const fetchSettings = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/settings.php?key=contribution`,
      );
      const data = await res.json();
      const candidate =
        data?.data?.contribution ||
        data?.data?.settings?.contribution ||
        data?.contribution ||
        data?.settings?.contribution ||
        (data?.data && typeof data.data === "object" && data.data.min_deposit
          ? data.data
          : null);

      if (candidate) {
        applySettings(candidate);
      } else {
        const allRes = await fetch(`${API_BASE_URL}/api/settings.php`);
        const allData = await allRes.json();
        const c =
          allData?.data?.contribution ||
          allData?.data?.settings?.contribution ||
          allData?.contribution ||
          allData?.settings?.contribution;
        if (c) applySettings(c);
      }
    } catch (err) {
      console.error("[Deposit] Failed to load settings:", err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  // ============================================================
  // Fetch members
  // ============================================================
  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await response.json();
      const list =
        data.members || data.data?.members || data.data || data.users || [];
      if (Array.isArray(list)) {
        setMembers(list);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  // ============================================================
  // Member balance — resilient
  // ============================================================
  const fetchMemberBalance = async (memberId) => {
    const idNum = parseInt(memberId, 10);

    const fromList = members.find((m) => parseInt(m.id, 10) === idNum);
    if (fromList) {
      const b = extractBalance(fromList);
      if (b !== undefined) {
        setMemberBalance(b);
        return;
      }
    }

    try {
      let res = await fetch(`${API_BASE_URL}/api/members.php?id=${memberId}`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/members.php/${memberId}`);
      }

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return;
      }

      const balance = extractBalance(data);
      if (balance !== undefined) {
        setMemberBalance(balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // ============================================================
  // Daily total + count
  // ============================================================
  const fetchDailyTotal = async (memberId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const data = await res.json();

      if (Array.isArray(data.transactions)) {
        const todayTxns = data.transactions.filter((t) => {
          const tMember = t.memberId ?? t.member_id;
          const tType = t.type;
          const tDate = (t.date || t.created_at || "").slice(0, 10);
          return (
            parseInt(tMember, 10) === parseInt(memberId, 10) &&
            tType === "deposit" &&
            tDate === today
          );
        });
        const total = todayTxns.reduce(
          (sum, t) => sum + toNonNegativeNumber(t.amount, 0),
          0,
        );
        setDailyTotal(total);
        setDailyCount(todayTxns.length);
      }
    } catch (error) {
      console.error("Error fetching daily total:", error);
    }
  };

  const handleMemberChange = (e) => {
    const memberId = e.target.value;
    setSelectedMember(memberId);
    if (memberId) {
      fetchMemberBalance(memberId);
      fetchDailyTotal(memberId);
    }
  };

  const formatCurrency = (a) => {
    const n = toNonNegativeNumber(a, 0);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  // ============================================================
  // Payment slip handlers
  // ============================================================
  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are allowed");
      return;
    }

    // Validate size
    if (file.size > MAX_SLIP_SIZE_MB * 1024 * 1024) {
      toast.error(`File is too large (max ${MAX_SLIP_SIZE_MB} MB)`);
      return;
    }

    setSlipFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // data URL
      setSlipBase64(result);
      // Only show image preview for images, not PDFs
      setSlipPreview(file.type.startsWith("image/") ? result : "");
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsDataURL(file);
  };

  const removeSlip = () => {
    setSlipFile(null);
    setSlipPreview("");
    setSlipBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ============================================================
  // Cancel — clears form
  // ============================================================
  const handleCancel = () => {
    if (loading) return;
    setAmount("");
    setDescription("");
    removeSlip();
    toast.success("Deposit cancelled");
  };

  // ============================================================
  // Submit deposit
  // ============================================================
  const handleDeposit = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }

    const depositAmount = toPositiveNumber(amount, NaN);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const {
      min_deposit,
      max_deposit,
      daily_limit,
      max_daily_deposits,
      allow_multiple_deposits,
    } = settings;

    if (depositAmount < min_deposit) {
      toast.error(`Minimum deposit is ${formatCurrency(min_deposit)}`);
      return;
    }
    if (depositAmount > max_deposit) {
      toast.error(
        `Maximum deposit per transaction is ${formatCurrency(max_deposit)}`,
      );
      return;
    }
    if (!allow_multiple_deposits && dailyCount >= 1) {
      toast.error("Multiple deposits per day are not allowed");
      return;
    }
    if (
      allow_multiple_deposits &&
      max_daily_deposits > 0 &&
      dailyCount >= max_daily_deposits
    ) {
      toast.error(
        `Daily deposit count reached (${max_daily_deposits} per day). Try again tomorrow.`,
      );
      return;
    }
    if (dailyTotal + depositAmount > daily_limit) {
      toast.error(
        `Daily limit of ${formatCurrency(daily_limit)} exceeded. ` +
          `Remaining: ${formatCurrency(Math.max(0, daily_limit - dailyTotal))}`,
      );
      return;
    }

    setLoading(true);

    const member = members.find((m) => m.id === parseInt(selectedMember, 10));
    const transaction = {
      memberId: parseInt(selectedMember, 10),
      memberName: member?.name || user?.name || "Unknown",
      accountNumber:
        member?.accountNumber ||
        member?.account_number ||
        member?.account_no ||
        user?.accountNumber ||
        user?.account_number ||
        "",
      type: "deposit",
      amount: depositAmount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: description || "Deposit",
      // Payment slip
      payment_slip: slipBase64 || null,
      payment_slip_name: slipFile?.name || null,
      payment_slip_type: slipFile?.type || null,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(transaction),
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (response.ok) {
        toast.success(
          `✅ Deposit of ${formatCurrency(depositAmount)} submitted successfully!`,
        );
        setAmount("");
        setDescription("");
        removeSlip();
        await fetchMembers();
        fetchMemberBalance(selectedMember);
        fetchDailyTotal(selectedMember);
      } else {
        toast.error(
          data.error ||
            data.message ||
            `Failed to submit deposit (HTTP ${response.status})`,
        );
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = (() => {
    const { default_contribution_amount, min_deposit, max_deposit } = settings;
    const base = Math.min(
      Math.max(default_contribution_amount || min_deposit, min_deposit),
      max_deposit,
    );
    const options = [base, base * 2, base * 5]
      .filter((v) => v >= min_deposit && v <= max_deposit)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    return options.length ? options : [min_deposit];
  })();

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      style={{
        padding: "24px",
        color: "white",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          padding: "32px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "32px" }}>💰</span>
          <div>
            <h2 style={{ margin: 0, color: "white" }}>Make a Deposit</h2>
            <p
              style={{
                color: "#9ca3af",
                margin: "4px 0 0 0",
                fontSize: "14px",
              }}
            >
              Add funds to your savings account
            </p>
          </div>
        </div>

        {/* Settings summary */}
        {settingsLoaded && (
          <div
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "#94a3b8" }}>Min per deposit: </span>
                <span style={{ color: "white", fontWeight: "600" }}>
                  {formatCurrency(settings.min_deposit)}
                </span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Max per deposit: </span>
                <span style={{ color: "white", fontWeight: "600" }}>
                  {formatCurrency(settings.max_deposit)}
                </span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Daily limit: </span>
                <span style={{ color: "white", fontWeight: "600" }}>
                  {formatCurrency(settings.daily_limit)}
                </span>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Max per day: </span>
                <span style={{ color: "white", fontWeight: "600" }}>
                  {settings.allow_multiple_deposits
                    ? settings.max_daily_deposits
                    : 1}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Display */}
        {selectedMember && (
          <div
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                  Current Balance
                </p>
                <p
                  style={{
                    color: "#34d399",
                    fontSize: "28px",
                    fontWeight: "bold",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(memberBalance)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
                  Today's Deposits
                </p>
                <p
                  style={{
                    color: "#fbbf24",
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(dailyTotal)}
                </p>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "11px",
                    margin: "2px 0 0 0",
                  }}
                >
                  {dailyCount} of{" "}
                  {settings.allow_multiple_deposits
                    ? settings.max_daily_deposits
                    : 1}{" "}
                  today
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleDeposit}>
          {/* Member selection (admin) */}
          {user?.role === "admin" && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#d1d5db",
                  marginBottom: "6px",
                }}
              >
                Select Member
              </label>
              <select
                value={selectedMember}
                onChange={handleMemberChange}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                }}
                required
              >
                <option value="">Choose a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - Balance: {formatCurrency(member.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#d1d5db",
                marginBottom: "6px",
              }}
            >
              Amount (₦)
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6b7280",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                ₦
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount (min ${settings.min_deposit}, max ${settings.max_deposit})`}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "16px",
                  outline: "none",
                }}
                min={settings.min_deposit}
                max={settings.max_deposit}
                step="0.01"
                required
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "4px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#d1d5db",
                marginBottom: "6px",
              }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly savings contribution"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "white",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          {/* Payment Slip Upload */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#d1d5db",
                marginBottom: "6px",
              }}
            >
              Payment Slip (Optional)
            </label>

            {!slipFile ? (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 16px",
                  borderRadius: "8px",
                  border: "2px dashed rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)";
                  e.currentTarget.style.backgroundColor =
                    "rgba(16,185,129,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.02)";
                }}
              >
                <span style={{ fontSize: "28px", marginBottom: "8px" }}>
                  📎
                </span>
                <span
                  style={{
                    color: "#d1d5db",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Click to upload receipt
                </span>
                <span
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  JPG, PNG, WEBP or PDF (max {MAX_SLIP_SIZE_MB} MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleSlipChange}
                  style={{ display: "none" }}
                />
              </label>
            ) : (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(16,185,129,0.3)",
                  backgroundColor: "rgba(16,185,129,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {slipPreview ? (
                      <img
                        src={slipPreview}
                        alt="Slip preview"
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "6px",
                          backgroundColor: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "22px",
                          flexShrink: 0,
                        }}
                      >
                        📄
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          color: "white",
                          fontSize: "13px",
                          fontWeight: "500",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {slipFile.name}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                        {(slipFile.size / 1024).toFixed(1)} KB •{" "}
                        {slipFile.type
                          .replace("image/", "")
                          .replace("application/", "")
                          .toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeSlip}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(239,68,68,0.3)",
                      backgroundColor: "rgba(239,68,68,0.15)",
                      color: "#f87171",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: "500",
                      flexShrink: 0,
                    }}
                  >
                    ✖ Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons: Submit + Cancel */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading || !selectedMember}
              style={{
                flex: 2,
                padding: "14px",
                borderRadius: "8px",
                border: "none",
                background: loading
                  ? "#6b7280"
                  : "linear-gradient(to right, #059669, #0d9488)",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "⏳ Processing..." : `💰 Submit Deposit`}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#d1d5db",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              ✖ Cancel
            </button>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(59, 130, 246, 0.1)",
            }}
          >
            <p
              style={{
                color: "#94a3b8",
                fontSize: "12px",
                margin: 0,
                textAlign: "center",
              }}
            >
              ⚡ Deposits require admin approval before they reflect in your
              balance
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberDeposit;
