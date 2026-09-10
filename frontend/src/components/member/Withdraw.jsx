import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberWithdraw = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberBalance, setMemberBalance] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      if (userData.role === "member" || userData.role === "user") {
        setSelectedMember(userData.id);
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
        setMemberBalance(data.member.balance || 0);
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

  const handleMemberChange = (e) => {
    const memberId = e.target.value;
    setSelectedMember(memberId);
    if (memberId) {
      fetchMemberBalance(memberId);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check if member has enough balance
    if (withdrawAmount > memberBalance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(memberBalance)}`,
      );
      return;
    }

    // Minimum withdrawal check
    const MIN_WITHDRAWAL = 500;
    if (withdrawAmount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL)}`);
      return;
    }

    setLoading(true);

    const member = members.find((m) => m.id === parseInt(selectedMember));
    const transaction = {
      memberId: parseInt(selectedMember),
      memberName: member?.name || "Unknown",
      accountNumber: member?.accountNumber || "",
      type: "withdrawal",
      amount: withdrawAmount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: description || "Withdrawal request",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transaction),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `✅ Withdrawal of ${formatCurrency(withdrawAmount)} submitted successfully!`,
        );
        setAmount("");
        setDescription("");
        // Refresh balance
        fetchMemberBalance(selectedMember);
      } else {
        toast.error(
          data.error || data.message || "Failed to submit withdrawal",
        );
      }
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast.error("Failed to submit withdrawal. Please try again.");
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
          <span style={{ fontSize: "32px" }}>💸</span>
          <div>
            <h2 style={{ margin: 0, color: "white" }}>Withdraw Funds</h2>
            <p
              style={{
                color: "#9ca3af",
                margin: "4px 0 0 0",
                fontSize: "14px",
              }}
            >
              Request a withdrawal from your savings
            </p>
          </div>
        </div>

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
                  Available Balance
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
                  Min. Withdrawal
                </p>
                <p
                  style={{
                    color: "#fbbf24",
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "4px 0 0 0",
                  }}
                >
                  ₦500
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleWithdraw}>
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
                onClick={() =>
                  setAmount(Math.min(500, memberBalance).toString())
                }
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
                onClick={() =>
                  setAmount(Math.min(1000, memberBalance).toString())
                }
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
                onClick={() =>
                  setAmount(Math.min(2000, memberBalance).toString())
                }
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
              placeholder="e.g., Emergency withdrawal"
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
            disabled={loading || !selectedMember}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              background: loading
                ? "#6b7280"
                : "linear-gradient(to right, #ef4444, #dc2626)",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "⏳ Processing..." : "💸 Submit Withdrawal"}
          </button>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.1)",
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
              ⚡ Withdrawals require admin approval before funds are released
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberWithdraw;
