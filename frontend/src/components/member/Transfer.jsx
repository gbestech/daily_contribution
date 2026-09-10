import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberTransfer = () => {
  const [members, setMembers] = useState([]);
  const [fromMember, setFromMember] = useState("");
  const [toMember, setToMember] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fromBalance, setFromBalance] = useState(0);
  const [user, setUser] = useState(null);

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

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!fromMember || !toMember) {
      toast.error("Please select both members");
      return;
    }

    if (fromMember === toMember) {
      toast.error("Cannot transfer to the same member");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check if sender has enough balance
    const fromMemberData = members.find((m) => m.id === parseInt(fromMember));
    if (transferAmount > (fromMemberData?.balance || 0)) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(fromMemberData?.balance || 0)}`,
      );
      return;
    }

    setLoading(true);

    const transfer = {
      fromMemberId: parseInt(fromMember),
      toMemberId: parseInt(toMember),
      fromMemberName: fromMemberData?.name || "Unknown",
      toMemberName:
        members.find((m) => m.id === parseInt(toMember))?.name || "Unknown",
      fromAccountNumber: fromMemberData?.accountNumber || "",
      toAccountNumber:
        members.find((m) => m.id === parseInt(toMember))?.accountNumber || "",
      amount: transferAmount,
      date: new Date().toISOString().split("T")[0],
      description:
        description ||
        `Transfer to ${members.find((m) => m.id === parseInt(toMember))?.name}`,
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
          `✅ Transfer of ${formatCurrency(transferAmount)} submitted successfully!`,
        );
        setAmount("");
        setDescription("");
        setToMember("");
        // Refresh balance
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
          <span style={{ fontSize: "32px" }}>🔄</span>
          <div>
            <h2 style={{ margin: 0, color: "white" }}>Transfer Funds</h2>
            <p
              style={{
                color: "#9ca3af",
                margin: "4px 0 0 0",
                fontSize: "14px",
              }}
            >
              Send money to other members
            </p>
          </div>
        </div>

        {fromMember && (
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
                  Your Balance
                </p>
                <p
                  style={{
                    color: "#34d399",
                    fontSize: "28px",
                    fontWeight: "bold",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(fromBalance)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
                  Available for transfer
                </p>
                <p
                  style={{
                    color: "#60a5fa",
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
                color: "#d1d5db",
                marginBottom: "6px",
              }}
            >
              From (Sender)
            </label>
            <select
              value={fromMember}
              onChange={handleFromMemberChange}
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
              <option value="">Select sender...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - Balance: {formatCurrency(member.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* To Member */}
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
              To (Recipient)
            </label>
            <select
              value={toMember}
              onChange={(e) => setToMember(e.target.value)}
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
              <option value="">Select recipient...</option>
              {members
                .filter((m) => m.id !== parseInt(fromMember))
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - Balance: {formatCurrency(member.balance)}
                  </option>
                ))}
            </select>
          </div>

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
                placeholder="Enter amount"
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
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setAmount("500")}
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
                ₦500
              </button>
              <button
                type="button"
                onClick={() => setAmount("1000")}
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
                ₦1,000
              </button>
              <button
                type="button"
                onClick={() => setAmount("2000")}
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
                ₦2,000
              </button>
            </div>
          </div>

          {/* Description */}
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
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "white",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !fromMember || !toMember}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              background: loading
                ? "#6b7280"
                : "linear-gradient(to right, #7c3aed, #6d28d9)",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "⏳ Processing..." : "🔄 Submit Transfer"}
          </button>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "rgba(234, 179, 8, 0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(234, 179, 8, 0.1)",
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
              ⚡ Transfers require admin approval before completion
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberTransfer;
