import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberTransfer = () => {
  const [members, setMembers] = useState([]);
  const [fromMember, setFromMember] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [toMember, setToMember] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fromBalance, setFromBalance] = useState(0);
  const [user, setUser] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);

  const isMember = user?.role === "member" || user?.role === "user";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);

      if (userData.role === "member" || userData.role === "user") {
        setFromMember(userData.id);
        fetchMemberBalance(userData.id);
      }
    }
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await response.json();
      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchMemberBalance = async (memberId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${memberId}`,
      );
      const data = await response.json();
      if (data.member) {
        setFromBalance(data.member.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
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

  const handleFromMemberChange = (e) => {
    const memberId = e.target.value;
    setFromMember(memberId);
    if (memberId) {
      fetchMemberBalance(memberId);
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  const getAccountNumber = (m) => m?.accountNumber || m?.account_number || "";
  const getPassportPhoto = (m) =>
    m?.passport_photo || m?.passportPhoto || m?.photo || "";
  const getMemberName = (m) => m?.name || m?.full_name || m?.fullName || "";

  const getPhotoUrl = (m) => {
    const photo = getPassportPhoto(m);
    if (!photo) return null;
    if (photo.startsWith("http")) return photo;
    return `${API_BASE_URL}/api/uploads/passports/${photo}`;
  };

  const handleAccountLookup = (value) => {
    setToAccountNumber(value);
    setLookupError("");
    setToMember(null);

    const cleaned = value.trim();
    if (!cleaned) return;

    const found = members.find((m) => getAccountNumber(m) === cleaned);

    if (!found) {
      setLookupError("Account number not found");
      return;
    }

    if (Number(found.id) === Number(fromMember)) {
      setLookupError("You cannot transfer to your own account");
      return;
    }

    setToMember(found);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!fromMember) {
      toast.error("Please select a sender");
      return;
    }

    if (!toAccountNumber.trim()) {
      toast.error("Please enter the recipient's account number");
      return;
    }

    if (!toMember) {
      toast.error("Please enter a valid recipient account number");
      return;
    }

    if (Number(fromMember) === Number(toMember.id)) {
      toast.error("Cannot transfer to the same member");
      return;
    }

    if (isMember && Number(fromMember) !== Number(user.id)) {
      toast.error("You can only transfer from your own account");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const fromMemberData = members.find(
      (m) => Number(m.id) === Number(fromMember),
    );
    if (transferAmount > (fromMemberData?.balance || 0)) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(
          fromMemberData?.balance || 0,
        )}`,
      );
      return;
    }

    setLoading(true);

    const transfer = {
      fromMemberId: parseInt(fromMember),
      toMemberId: parseInt(toMember.id),
      fromMemberName: getMemberName(fromMemberData) || "Unknown",
      toMemberName: getMemberName(toMember) || "Unknown",
      fromAccountNumber: getAccountNumber(fromMemberData),
      toAccountNumber: getAccountNumber(toMember),
      amount: transferAmount,
      date: new Date().toISOString().split("T")[0],
      description:
        description || `Transfer to ${getMemberName(toMember) || "member"}`,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/transfers.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transfer),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `✅ Transfer of ${formatCurrency(
            transferAmount,
          )} submitted successfully!`,
        );
        setAmount("");
        setDescription("");
        setToAccountNumber("");
        setToMember(null);
        setLookupError("");
        fetchMemberBalance(fromMember);
      } else {
        toast.error(data.error || data.message || "Failed to submit transfer");
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      toast.error("Failed to submit transfer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const senderOptions = isMember
    ? members.filter((m) => Number(m.id) === Number(user?.id))
    : members;

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <style>{`
        .member-select {
          width: 100%;
          padding: 12px 40px 12px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background-color: var(--bg-surface-2);
          color: var(--text);
          font-size: 14px;
          outline: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='%23888' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 10px center;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .member-select:focus { border-color: var(--accent); }
        .member-select option {
          background-color: var(--bg-surface);
          color: var(--text);
          padding: 10px;
        }
        .member-select:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }
        .sender-locked {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--accent-bg);
        }
        .sender-locked-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--accent-bg);
          color: var(--accent-text);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
          overflow: hidden;
          border: 2px solid var(--accent);
        }
        .sender-locked-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .acct-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background-color: var(--bg-surface-2);
          color: var(--text);
          font-size: 16px;
          font-family: monospace;
          letter-spacing: 1px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .acct-input:focus { border-color: var(--accent); }
        .acct-input.error { border-color: var(--debit); }
        .acct-input.valid { border-color: var(--credit); }
        .lookup-feedback {
          margin-top: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ===== BIG RECIPIENT CARD ===== */
        .recipient-card {
          margin-top: 12px;
          padding: 16px;
          border-radius: 14px;
          background: var(--approved-bg);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 16px;
          animation: fadeSlideIn 0.25s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .recipient-photo-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .recipient-photo {
          width: 96px;
          height: 96px;
          border-radius: 14px;
          background: var(--approved-bg);
          color: var(--credit);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 36px;
          overflow: hidden;
          border: 3px solid var(--credit);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.2);
          cursor: pointer;
          transition: transform 0.2s;
        }
        .recipient-photo:hover {
          transform: scale(1.03);
        }
        .recipient-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .recipient-photo-badge {
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--credit);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          border: 3px solid var(--bg-app);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }
        .recipient-info {
          flex: 1;
          min-width: 0;
        }
        .recipient-name {
          color: var(--text);
          font-size: 17px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        .recipient-acct {
          color: var(--text-muted);
          font-size: 13px;
          font-family: monospace;
          letter-spacing: 0.5px;
        }
        .recipient-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          padding: 3px 10px;
          border-radius: 20px;
          background: var(--approved-bg);
          border: 1px solid var(--border);
          color: var(--credit);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===== FULL PHOTO MODAL ===== */
        .photo-modal-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-overlay);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        .photo-modal-img {
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          border: 3px solid var(--credit);
        }
        .photo-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .photo-modal-close:hover {
          background: var(--bg-surface-2);
        }
      `}</style>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "16px",
          padding: "32px",
          border: "1px solid var(--border)",
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
          <span style={{ fontSize: "32px" }}>🔄</span>
          <div>
            <h2 style={{ margin: 0, color: "var(--text)" }}>Transfer Funds</h2>
            <p
              style={{
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
                fontSize: "14px",
              }}
            >
              {isAdmin
                ? "Transfer funds between members"
                : "Send money to other members"}
            </p>
          </div>
        </div>

        {fromMember && (
          <div
            style={{
              backgroundColor: "var(--approved-bg)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              border: "1px solid var(--border)",
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
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    margin: 0,
                  }}
                >
                  {isAdmin ? "Sender Balance" : "Your Balance"}
                </p>
                <p
                  style={{
                    color: "var(--credit)",
                    fontSize: "28px",
                    fontWeight: "bold",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(fromBalance)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    margin: 0,
                  }}
                >
                  Available for transfer
                </p>
                <p
                  style={{
                    color: "var(--info)",
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(fromBalance)}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleTransfer}>
          {/* From Member */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text)",
                marginBottom: "6px",
              }}
            >
              From (Sender)
            </label>

            {isMember ? (
              <div className="sender-locked">
                <div className="sender-locked-avatar">
                  {getPhotoUrl(user) ? (
                    <img src={getPhotoUrl(user)} alt="" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: "14px",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user?.name || "You"}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    🔒 Your account
                  </div>
                </div>
              </div>
            ) : (
              <select
                className="member-select"
                value={fromMember}
                onChange={handleFromMemberChange}
                required
              >
                <option value="">Select sender...</option>
                {senderOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - Balance: {formatCurrency(member.balance)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* To Member — by account number */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text)",
                marginBottom: "6px",
              }}
            >
              To (Recipient Account Number)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={toAccountNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                handleAccountLookup(v);
              }}
              placeholder="Enter recipient's account number"
              className={`acct-input ${
                lookupError ? "error" : toMember ? "valid" : ""
              }`}
              maxLength="20"
              autoComplete="off"
              required
            />

            {lookupError && (
              <div
                className="lookup-feedback"
                style={{ color: "var(--debit)" }}
              >
                ❌ {lookupError}
              </div>
            )}

            {/* ===== BIG RECIPIENT CARD WITH LARGE PHOTO ===== */}
            {toMember && (
              <div className="recipient-card">
                <div className="recipient-photo-wrap">
                  <div
                    className="recipient-photo"
                    onClick={() => {
                      const url = getPhotoUrl(toMember);
                      if (url) setPhotoModal(url);
                    }}
                    title="Click to enlarge"
                  >
                    {getPhotoUrl(toMember) ? (
                      <img
                        src={getPhotoUrl(toMember)}
                        alt={getMemberName(toMember)}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentNode.textContent =
                            getMemberName(toMember)?.charAt(0)?.toUpperCase() ||
                            "U";
                        }}
                      />
                    ) : (
                      getMemberName(toMember)?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="recipient-photo-badge">✓</div>
                </div>

                <div className="recipient-info">
                  <div className="recipient-name">
                    {getMemberName(toMember)}
                  </div>
                  <div className="recipient-acct">
                    {getAccountNumber(toMember)}
                  </div>
                  <div className="recipient-verified">
                    ✅ Verified Recipient
                  </div>
                </div>
              </div>
            )}

            {!lookupError && !toMember && toAccountNumber.length > 0 && (
              <div
                className="lookup-feedback"
                style={{ color: "var(--text-muted)" }}
              >
                🔎 Searching...
              </div>
            )}
          </div>

          {/* Amount */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text)",
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
                  color: "var(--text-dim)",
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
                placeholder="Enter amount"
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-surface-2)",
                  color: "var(--text)",
                  fontSize: "16px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {["500", "1000", "2000"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ₦{Number(val).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text)",
                marginBottom: "6px",
              }}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Payment for goods"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface-2)",
                color: "var(--text)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !fromMember || !toMember || !amount}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              background:
                loading || !toMember
                  ? "var(--text-dim)"
                  : "linear-gradient(to right, var(--accent), var(--accent-hover))",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              cursor:
                loading || !fromMember || !toMember || !amount
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.3s",
              opacity: loading || !toMember ? 0.7 : 1,
            }}
          >
            {loading ? "⏳ Processing..." : "🔄 Submit Transfer"}
          </button>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "var(--pending-bg)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                margin: 0,
                textAlign: "center",
              }}
            >
              ⚡ Transfers require admin approval before completion
            </p>
          </div>
        </form>
      </div>

      {/* ===== FULL-SIZE PHOTO MODAL ===== */}
      {photoModal && (
        <div
          className="photo-modal-overlay"
          onClick={() => setPhotoModal(null)}
        >
          <button
            className="photo-modal-close"
            onClick={() => setPhotoModal(null)}
          >
            ×
          </button>
          <img
            src={photoModal}
            alt="Recipient"
            className="photo-modal-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default MemberTransfer;
