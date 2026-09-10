import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberDeposit = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberBalance, setMemberBalance] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [user, setUser] = useState(null);

  // Get logged-in user
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // If user is a member, auto-select them
      if (userData.role === "member" || userData.role === "user") {
        setSelectedMember(userData.id);
        fetchMemberBalance(userData.id);
        fetchDailyTotal(userData.id);
      }
    }
    fetchMembers();
  }, []);

  // Fetch all members (for admin)
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

  // Fetch member balance
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

  // Fetch daily total contributions
  const fetchDailyTotal = async (memberId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php?memberId=${memberId}&date=${today}&type=deposit`,
      );
      const data = await response.json();
      if (data.transactions) {
        const total = data.transactions.reduce((sum, t) => sum + t.amount, 0);
        setDailyTotal(total);
      }
    } catch (error) {
      console.error("Error fetching daily total:", error);
    }
  };

  // Handle member selection
  const handleMemberChange = (e) => {
    const memberId = e.target.value;
    setSelectedMember(memberId);
    if (memberId) {
      fetchMemberBalance(memberId);
      fetchDailyTotal(memberId);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Handle deposit submission
  const handleDeposit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Get settings (you can fetch from API or use constants)
    const MIN_DEPOSIT = 2000;
    const MAX_DEPOSIT = 2000;
    const DAILY_LIMIT = 2000;
    const MAX_DAILY_DEPOSITS = 1;

    // Validate minimum deposit
    if (depositAmount < MIN_DEPOSIT) {
      toast.error(`Minimum deposit is ${formatCurrency(MIN_DEPOSIT)}`);
      return;
    }

    // Validate maximum deposit
    if (depositAmount > MAX_DEPOSIT) {
      toast.error(
        `Maximum deposit per transaction is ${formatCurrency(MAX_DEPOSIT)}`,
      );
      return;
    }

    // Validate daily limit
    if (dailyTotal + depositAmount > DAILY_LIMIT) {
      toast.error(
        `Daily limit of ${formatCurrency(DAILY_LIMIT)} exceeded. You've contributed ${formatCurrency(dailyTotal)} today. Remaining: ${formatCurrency(DAILY_LIMIT - dailyTotal)}`,
      );
      return;
    }

    setLoading(true);

    const member = members.find((m) => m.id === parseInt(selectedMember));
    const transaction = {
      memberId: parseInt(selectedMember),
      memberName: member?.name || "Unknown",
      accountNumber: member?.accountNumber || "",
      type: "deposit",
      amount: depositAmount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: description || "Deposit",
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
          `✅ Deposit of ${formatCurrency(depositAmount)} submitted successfully!`,
        );
        setAmount("");
        setDescription("");
        // Refresh data
        fetchMemberBalance(selectedMember);
        fetchDailyTotal(selectedMember);
      } else {
        toast.error(data.error || data.message || "Failed to submit deposit");
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error("Failed to submit deposit. Please try again.");
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
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleDeposit}>
          {/* Member Selection (for admin) */}
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
                  transition: "border-color 0.2s",
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

          {/* Amount Input */}
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
                placeholder="Enter amount (e.g., 2000)"
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
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
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "rgba(255,255,255,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "transparent")
                }
              >
                ₦2,000
              </button>
              <button
                type="button"
                onClick={() => setAmount("5000")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "transparent",
                  color: "#9ca3af",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "rgba(255,255,255,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "transparent")
                }
              >
                ₦5,000
              </button>
              <button
                type="button"
                onClick={() => setAmount("10000")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "transparent",
                  color: "#9ca3af",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "rgba(255,255,255,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "transparent")
                }
              >
                ₦10,000
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
                transition: "border-color 0.2s",
              }}
            />
          </div>

          {/* Submit Button */}
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
                : "linear-gradient(to right, #059669, #0d9488)",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading && selectedMember) {
                e.target.style.opacity = "0.9";
                e.target.style.transform = "scale(1.01)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && selectedMember) {
                e.target.style.opacity = "1";
                e.target.style.transform = "scale(1)";
              }
            }}
          >
            {loading ? "⏳ Processing..." : `💰 Submit Deposit`}
          </button>

          {/* Info Notice */}
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
