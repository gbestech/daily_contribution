// src/components/MemberDetailModal.jsx
import React from "react";

const MemberDetailModal = ({
  member,
  transactions = [],
  onClose,
  formatCurrency,
  formatDate,
}) => {
  if (!member) return null;

  const memberTxns = transactions.filter(
    (t) => Number(t.memberId) === Number(member.id),
  );

  const totalCredit = memberTxns
    .filter((t) => t.category === "credit")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const totalDebit = memberTxns
    .filter((t) => t.category === "debit")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const balance = totalCredit - totalDebit;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          color: "white",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          animation: "popIn 0.2s ease-out",
        }}
      >
        <style>{`
          @keyframes popIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "22px" }}>👤 {member.name}</h3>
            <p
              style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "13px" }}
            >
              Member ID: #{member.id}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div style={cardStyle}>
            <span style={labelStyle}>Account Number</span>
            <span style={valueStyle}>
              {member.accountNumber || member.account_number || "—"}
            </span>
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>Email</span>
            <span
              style={{
                ...valueStyle,
                fontSize: "13px",
                wordBreak: "break-word",
              }}
            >
              {member.email || "—"}
            </span>
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>Phone</span>
            <span style={valueStyle}>{member.phone || "—"}</span>
          </div>
          <div style={cardStyle}>
            <span style={labelStyle}>Status</span>
            <span style={{ ...valueStyle, color: "#34d399" }}>
              {member.status || "Active"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div style={statCardStyle}>
            <span style={labelStyle}>Credits</span>
            <span style={{ ...valueStyle, color: "#34d399" }}>
              {formatCurrency(totalCredit)}
            </span>
          </div>
          <div style={statCardStyle}>
            <span style={labelStyle}>Debits</span>
            <span style={{ ...valueStyle, color: "#f87171" }}>
              {formatCurrency(totalDebit)}
            </span>
          </div>
          <div style={statCardStyle}>
            <span style={labelStyle}>Balance</span>
            <span
              style={{
                ...valueStyle,
                color: balance >= 0 ? "#34d399" : "#f87171",
              }}
            >
              {formatCurrency(balance)}
            </span>
          </div>
        </div>

        {/* Recent Transactions */}
        <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#cbd5e1" }}>
          Recent Transactions ({memberTxns.length})
        </h4>
        <div
          style={{
            maxHeight: "220px",
            overflowY: "auto",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            padding: "8px",
          }}
        >
          {memberTxns.length === 0 ? (
            <p
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                textAlign: "center",
                padding: "20px",
                margin: 0,
              }}
            >
              No transactions found
            </p>
          ) : (
            memberTxns.slice(0, 10).map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div style={{ color: "white", textTransform: "capitalize" }}>
                    {t.type}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "11px" }}>
                    {formatDate(t.date)}
                  </div>
                </div>
                <div
                  style={{
                    color: t.category === "debit" ? "#f87171" : "#34d399",
                    fontWeight: 600,
                  }}
                >
                  {t.category === "debit" ? "-" : "+"}
                  {formatCurrency(t.amount)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const cardStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const statCardStyle = { ...cardStyle, textAlign: "center" };

const labelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const valueStyle = {
  color: "white",
  fontSize: "15px",
  fontWeight: 600,
  wordBreak: "break-word",
};

export default MemberDetailModal;
