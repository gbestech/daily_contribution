// src/components/member/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberProfile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    accountNumber: "",
    membershipType: "",
    joinDate: "",
    status: "",
    balance: 0,
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        accountNumber: user.accountNumber || user.account_number || "N/A",
        membershipType:
          user.membershipType || user.membership_type || "Standard",
        joinDate: user.joinDate || user.join_date || "N/A",
        status: user.status || "Active",
        balance: user.balance || 0,
        password: "",
        confirmPassword: "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Update the user in context and localStorage
        const updatedUser = {
          ...user,
          name: formData.name,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        login(updatedUser, localStorage.getItem("token"));

        toast.success("✅ Profile updated successfully!");
        setEditMode(false);
        setFormData({
          ...formData,
          password: "",
          confirmPassword: "",
        });
      } else {
        toast.error(data.message || data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          👤 My Profile
        </h2>
        <button
          onClick={() => setEditMode(!editMode)}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            background: editMode
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(59, 130, 246, 0.15)",
            color: editMode ? "#f87171" : "#60a5fa",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = editMode
              ? "rgba(239, 68, 68, 0.25)"
              : "rgba(59, 130, 246, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = editMode
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(59, 130, 246, 0.15)";
          }}
        >
          {editMode ? "Cancel" : "✏️ Edit Profile"}
        </button>
      </div>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "24px",
        }}
      >
        {!editMode ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Full Name
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                }}
              >
                {formData.name || "N/A"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Email</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                }}
              >
                {formData.email || "N/A"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Phone</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                }}
              >
                {formData.phone || "N/A"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Account Number
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                  fontFamily: "monospace",
                }}
              >
                {formData.accountNumber}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Membership Type
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                }}
              >
                {formData.membershipType}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Status</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                }}
              >
                {formData.status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Balance</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                  color: "#34d399",
                }}
              >
                {formatCurrency(formData.balance)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Joined</div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  marginTop: "4px",
                }}
              >
                {formatDate(formData.joinDate)}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#94a3b8",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: loading ? "#6b7280" : "#00aa69",
                  color: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.background = "#008854";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.background = "#00aa69";
                }}
              >
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
