// src/components/member/Profile.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberProfile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    full_name: "",
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
        full_name: user.full_name || user.name || "",
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

      // Set profile image if available
      if (user.profile_image || user.profileImage) {
        const imageUrl = user.profile_image || user.profileImage;
        setImagePreview(
          imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`,
        );
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error(
          "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
        );
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    // Validate passwords match if password is being changed
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      let updateData = {
        name: formData.full_name || formData.name,
        full_name: formData.full_name || formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      // If there's a profile image, use FormData for multipart upload
      if (profileImage) {
        const formDataObj = new FormData();
        formDataObj.append("name", updateData.name);
        formDataObj.append("full_name", updateData.full_name);
        formDataObj.append("email", updateData.email);
        formDataObj.append("phone", updateData.phone);
        if (updateData.password) {
          formDataObj.append("password", updateData.password);
        }
        formDataObj.append("profile_image", profileImage);

        const response = await fetch(
          `${API_BASE_URL}/api/members.php/${user.id}`,
          {
            method: "PUT",
            body: formDataObj,
          },
        );

        const data = await response.json();

        if (response.ok) {
          // Update user in context with new data including image
          const updatedUser = {
            ...user,
            name: formData.full_name || formData.name,
            full_name: formData.full_name || formData.name,
            email: formData.email,
            phone: formData.phone,
            profile_image: data.profile_image || user.profile_image,
            profileImage: data.profileImage || user.profileImage,
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
          toast.error(data.message || "Failed to update profile");
        }
      } else {
        // Regular JSON update without image
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
          // Update user in context with new data
          const updatedUser = {
            ...user,
            name: formData.full_name || formData.name,
            full_name: formData.full_name || formData.name,
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
          toast.error(data.message || "Failed to update profile");
        }
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

  const getStatusBadge = (status) => {
    const colors = {
      Active: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" },
      Inactive: { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" },
      Suspended: { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" },
    };
    const style = colors[status] || colors.Active;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "500",
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.color}33`,
        }}
      >
        {status || "Active"}
      </span>
    );
  };

  const getMembershipBadge = (type) => {
    const colors = {
      Premium: { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" },
      VIP: { bg: "rgba(168, 85, 247, 0.2)", color: "#a78bfa" },
      Standard: { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" },
    };
    const style = colors[type] || colors.Standard;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "500",
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.color}33`,
        }}
      >
        {type || "Standard"}
      </span>
    );
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        color: "white",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .profile-card {
          background-color: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 24px;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .avatar-container {
          position: relative;
          width: 100px;
          height: 100px;
        }
        .avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #0d9488);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          font-weight: bold;
          color: white;
          overflow: hidden;
          flex-shrink: 0;
          border: 3px solid rgba(255,255,255,0.1);
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-upload-overlay {
          position: absolute;
          bottom: 0;
          right: 0;
          background: #00aa69;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px solid #0f172a;
          transition: all 0.2s;
          font-size: 16px;
        }
        .avatar-upload-overlay:hover {
          transform: scale(1.1);
          background: #008854;
        }
        .avatar-upload-overlay input {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .remove-image-btn {
          position: absolute;
          top: -5px;
          right: -5px;
          background: rgba(239, 68, 68, 0.9);
          border: 2px solid #0f172a;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          font-size: 14px;
          transition: all 0.2s;
          padding: 0;
        }
        .remove-image-btn:hover {
          background: rgba(239, 68, 68, 1);
          transform: scale(1.1);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: #00aa69;
        }
        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-input::placeholder {
          color: #64748b;
        }
        .btn-primary {
          padding: 10px 24px;
          border-radius: 8px;
          border: none;
          background: #00aa69;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: #008854;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 10px 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
        }
        .btn-edit {
          padding: 10px 24px;
          border-radius: 8px;
          border: none;
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-edit:hover {
          background: rgba(59, 130, 246, 0.25);
        }
        .btn-danger {
          padding: 10px 24px;
          border-radius: 8px;
          border: none;
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.25);
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .info-item {
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .info-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .info-value {
          font-size: 16px;
          font-weight: 500;
          margin-top: 4px;
        }
        .stat-card {
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #34d399;
        }
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          .profile-header {
            flex-direction: column;
            text-align: center;
          }
          .avatar-container {
            margin: 0 auto;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="profile-header">
        <div className="avatar-container">
          <div className="avatar">
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" />
            ) : (
              formData.full_name?.charAt(0) || formData.name?.charAt(0) || "U"
            )}
          </div>
          {editMode && (
            <>
              <div className="avatar-upload-overlay">
                <span>📷</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              {imagePreview && (
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={removeImage}
                  title="Remove image"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            {formData.full_name || formData.name || "User"}
          </h2>
          <p style={{ color: "#94a3b8", margin: "4px 0 0 0" }}>
            {formData.email}
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {getStatusBadge(formData.status)}
            {getMembershipBadge(formData.membershipType)}
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "500",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              Account: {formData.accountNumber}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {!editMode ? (
            <button className="btn-edit" onClick={() => setEditMode(true)}>
              ✏️ Edit Profile
            </button>
          ) : (
            <>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditMode(false);
                  setProfileImage(null);
                  setImagePreview(
                    user?.profile_image || user?.profileImage
                      ? `${API_BASE_URL}${user.profile_image || user.profileImage}`
                      : null,
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(formData.balance)}</div>
          <div className="stat-label">💰 Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#60a5fa" }}>
            {formData.accountNumber}
          </div>
          <div className="stat-label">🏦 Account Number</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#a78bfa" }}>
            {formatDate(formData.joinDate)}
          </div>
          <div className="stat-label">📅 Joined</div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="profile-card" style={{ marginTop: "24px" }}>
        <h3
          style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0" }}
        >
          📋 Personal Information
        </h3>

        {!editMode ? (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Full Name</div>
              <div className="info-value">
                {formData.full_name || formData.name || "N/A"}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Email Address</div>
              <div className="info-value">{formData.email || "N/A"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Phone Number</div>
              <div className="info-value">{formData.phone || "N/A"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Account Number</div>
              <div className="info-value" style={{ fontFamily: "monospace" }}>
                {formData.accountNumber || "N/A"}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Membership Type</div>
              <div className="info-value">
                {formData.membershipType || "Standard"}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value">{formData.status || "Active"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Joined Date</div>
              <div className="info-value">{formatDate(formData.joinDate)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Balance</div>
              <div className="info-value" style={{ color: "#34d399" }}>
                {formatCurrency(formData.balance)}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile}>
            <div className="info-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  className="form-input"
                  value={formData.full_name || formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.accountNumber}
                  disabled
                />
              </div>
              <div className="form-group">
                <label className="form-label">Membership Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.membershipType}
                  disabled
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.status}
                  disabled
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
