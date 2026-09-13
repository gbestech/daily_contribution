// src/components/member/Profile.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const MemberProfile = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    accountNumber: "",
    membershipType: "",
    joinDate: "",
    status: "",
    balance: 0,
    date_of_birth: "",
    gender: "",
    address: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_relationship: "",
    savings_plan: "",
    bank_name: "",
    bank_account_number: "",
    passport_photo: "",
    profile_completed: 0,
    password: "",
    confirmPassword: "",
  });

  // ============================================================
  // Fetch fresh profile — does NOT call login() to avoid
  // triggering the useEffect loop that was freezing inputs.
  // ============================================================
  const fetchFreshProfile = async (showToastFlag = false) => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php/${user.id}`);
      const data = await res.json();

      if (data.member) {
        const m = data.member;

        setFormData({
          name: m.name || "",
          email: m.email || "",
          phone: m.phone || "",
          accountNumber: m.accountNumber || m.account_number || "N/A",
          membershipType: m.membershipType || "Standard",
          joinDate: m.joinDate || "",
          status: m.status || "Active",
          balance: m.balance || 0,
          date_of_birth: m.date_of_birth || "",
          gender: m.gender || "",
          address: m.address || "",
          next_of_kin_name: m.next_of_kin_name || "",
          next_of_kin_phone: m.next_of_kin_phone || "",
          next_of_kin_relationship: m.next_of_kin_relationship || "",
          savings_plan: m.savings_plan || "",
          bank_name: m.bank_name || "",
          bank_account_number: m.bank_account_number || "",
          passport_photo: m.passport_photo || "",
          profile_completed: m.profile_completed || 0,
          password: "",
          confirmPassword: "",
        });

        if (m.passport_photo) {
          setPassportPreview(
            `${API_BASE_URL}/api/uploads/passports/${m.passport_photo}`,
          );
        }

        setShowCompletion(m.profile_completed !== 1);

        // Sync to localStorage silently — no context update here
        const updatedUser = { ...user, ...m };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        if (showToastFlag) toast.success("✅ Refreshed");
      }
    } catch (e) {
      console.error("Fetch profile error:", e);
      if (showToastFlag) toast.error("Failed to sync");
    } finally {
      setSyncing(false);
    }
  };

  // Only fire when the user ID changes, not on every user object change
  useEffect(() => {
    if (user?.id) {
      fetchFreshProfile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePassportSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Passport must be under 3MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image");
      return;
    }
    setPassportFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPassportPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadPassport = async () => {
    if (!passportFile) return null;
    const fd = new FormData();
    fd.append("passport", passportFile);
    fd.append("memberId", user.id);
    const res = await fetch(`${API_BASE_URL}/api/upload_passport.php`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.error || "Upload failed");
    return data.filename;
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();

    const required = [
      ["date_of_birth", "Date of Birth"],
      ["gender", "Gender"],
      ["phone", "Phone Number"],
      ["address", "Address"],
      ["next_of_kin_name", "Next of Kin Name"],
      ["next_of_kin_phone", "Next of Kin Phone"],
      ["next_of_kin_relationship", "Next of Kin Relationship"],
      ["savings_plan", "Savings Plan"],
    ];

    for (const [k, label] of required) {
      if (!formData[k] || String(formData[k]).trim() === "") {
        toast.error(`${label} is required`);
        return;
      }
    }

    if (!passportFile && !formData.passport_photo) {
      toast.error("Passport photo is required");
      return;
    }

    setLoading(true);
    try {
      let filename = formData.passport_photo;
      if (passportFile) filename = await uploadPassport();

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        next_of_kin_name: formData.next_of_kin_name,
        next_of_kin_phone: formData.next_of_kin_phone,
        next_of_kin_relationship: formData.next_of_kin_relationship,
        savings_plan: formData.savings_plan,
        bank_name: formData.bank_name || "",
        bank_account_number: formData.bank_account_number || "",
        passport_photo: filename,
        profile_completed: 1,
      };

      const res = await fetch(`${API_BASE_URL}/api/members.php/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        // Now it's safe to update context — this is a one-time action
        const freshUser = { ...user, ...(data.member || payload) };
        localStorage.setItem("user", JSON.stringify(freshUser));
        login(freshUser, localStorage.getItem("token"));

        toast.success("🎉 Profile completed!");
        setPassportFile(null);
        setShowCompletion(false);
      } else {
        toast.error(data.message || data.error || "Failed");
      }
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
      };
      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords don't match");
          setLoading(false);
          return;
        }
        payload.password = formData.password;
      }
      const res = await fetch(`${API_BASE_URL}/api/members.php/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // Update context after successful save only
        const freshUser = { ...user, ...(data.member || payload) };
        localStorage.setItem("user", JSON.stringify(freshUser));
        login(freshUser, localStorage.getItem("token"));

        toast.success("✅ Profile updated!");
        setEditMode(false);
        // Refresh silently
        await fetchFreshProfile(false);
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (a) => {
    if (!a && a !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(a);
  };

  const formatDate = (d) => {
    if (!d || d === "N/A") return "N/A";
    try {
      return new Date(d).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  // ==================== RENDER ====================
  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
        color: "white",
      }}
    >
      <style>{`
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #10b981;
        }
        .form-textarea { min-height: 80px; resize: vertical; }
        .form-input::placeholder, .form-textarea::placeholder { color: #6b7280; }
        .form-select option { background: #1e293b; }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 640px) {
          .info-grid { grid-template-columns: 1fr; }
        }
        .btn-primary {
          padding: 12px 28px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #059669, #0d9488);
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
        }
      `}</style>

      {showCompletion ? (
        // ================= COMPLETION FORM =================
        <div>
          <div
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: "0 0 6px 0", fontSize: "20px" }}>
              📝 Complete Your Profile
            </h2>
            <p style={{ margin: 0, color: "#93c5fd", fontSize: "14px" }}>
              Your account number is{" "}
              <strong style={{ color: "white", fontFamily: "monospace" }}>
                {formData.accountNumber}
              </strong>
              . Please fill in the details below to activate your account.
            </p>
          </div>

          <form onSubmit={handleCompleteProfile}>
            {/* Passport Upload */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "inline-block",
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #059669, #0d9488)",
                  cursor: "pointer",
                  border: "3px solid rgba(255,255,255,0.15)",
                  position: "relative",
                }}
              >
                {passportPreview ? (
                  <img
                    src={passportPreview}
                    alt="Passport"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "40px",
                      color: "white",
                    }}
                  >
                    📷
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePassportSelect}
                style={{ display: "none" }}
              />
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  marginTop: "8px",
                }}
              >
                Tap to upload passport photograph (required)
              </p>
            </div>

            {/* Date of Birth & Gender */}
            <div className="info-grid" style={{ marginBottom: "14px" }}>
              <div>
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Phone & Savings Plan */}
            <div className="info-grid" style={{ marginBottom: "14px" }}>
              <div>
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="form-input"
                  maxLength="11"
                  placeholder="08012345678"
                  required
                />
              </div>
              <div>
                <label className="form-label">Savings Plan *</label>
                <select
                  name="savings_plan"
                  value={formData.savings_plan}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Choose plan</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom: "14px" }}>
              <label className="form-label">Residential Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Enter your full residential address"
                required
              />
            </div>

            {/* Next of Kin */}
            <div
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "14px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "14px",
                  color: "#a78bfa",
                }}
              >
                👥 Next of Kin
              </h4>
              <div className="info-grid">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    name="next_of_kin_name"
                    value={formData.next_of_kin_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Next of kin name"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    name="next_of_kin_phone"
                    value={formData.next_of_kin_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        next_of_kin_phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="form-input"
                    maxLength="11"
                    placeholder="08012345678"
                    required
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Relationship *</label>
                  <select
                    name="next_of_kin_relationship"
                    value={formData.next_of_kin_relationship}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bank (Optional) */}
            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.05)",
                border: "1px solid rgba(59, 130, 246, 0.15)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "14px",
                  color: "#60a5fa",
                }}
              >
                🏦 Bank Details (Optional)
              </h4>
              <div className="info-grid">
                <div>
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., GTBank"
                  />
                </div>
                <div>
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bank_account_number: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="form-input"
                    maxLength="10"
                    placeholder="10 digits"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Saving..." : "✅ Complete Profile"}
            </button>
          </form>
        </div>
      ) : (
        // ================= NORMAL PROFILE VIEW =================
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
                👤 My Profile
              </h2>
              <p
                style={{
                  color: "#9ca3af",
                  margin: "2px 0 0 0",
                  fontSize: "13px",
                }}
              >
                {formData.accountNumber} • {formData.email}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => fetchFreshProfile(true)}
                disabled={syncing}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  cursor: syncing ? "not-allowed" : "pointer",
                  fontSize: "13px",
                }}
              >
                {syncing ? "⏳" : "🔄"} Sync
              </button>
              <button
                onClick={() => setEditMode(!editMode)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: editMode
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(16, 185, 129, 0.15)",
                  color: editMode ? "#f87171" : "#34d399",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {editMode ? "✕ Cancel" : "✏️ Edit"}
              </button>
            </div>
          </div>

          {/* Balance Card */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "12px",
              padding: "18px 22px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                background: "linear-gradient(135deg, #059669, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                fontWeight: "bold",
                border: "3px solid rgba(255,255,255,0.15)",
              }}
            >
              {passportPreview ? (
                <img
                  src={passportPreview}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                (formData.name || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>{formData.name}</h3>
              <div
                style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}
              >
                {formData.savings_plan} Saver • {formData.membershipType} Member
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                }}
              >
                Balance
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#34d399",
                }}
              >
                {formatCurrency(formData.balance)}
              </div>
            </div>
          </div>

          {!editMode ? (
            <div className="info-grid">
              <div>
                <label className="form-label">Phone</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.phone || "N/A"}
                </div>
              </div>
              <div>
                <label className="form-label">Date of Birth</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formatDate(formData.date_of_birth)}
                </div>
              </div>
              <div>
                <label className="form-label">Gender</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.gender || "N/A"}
                </div>
              </div>
              <div>
                <label className="form-label">Savings Plan</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.savings_plan || "N/A"}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Address</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.address || "N/A"}
                </div>
              </div>
              <div>
                <label className="form-label">Next of Kin</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.next_of_kin_name || "N/A"}
                </div>
              </div>
              <div>
                <label className="form-label">Next of Kin Phone</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.next_of_kin_phone || "N/A"}
                </div>
              </div>
              <div>
                <label className="form-label">Relationship</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.next_of_kin_relationship || "N/A"}
                </div>
              </div>
              <div>
                <label className="form-label">Bank</label>
                <div
                  className="form-input"
                  style={{ background: "transparent" }}
                >
                  {formData.bank_name || "Not provided"}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile}>
              <div className="info-grid">
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="form-input"
                    maxLength="11"
                  />
                </div>
                <div>
                  <label className="form-label">Savings Plan</label>
                  <select
                    name="savings_plan"
                    value={formData.savings_plan}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-textarea"
                  />
                </div>
                <div>
                  <label className="form-label">Bank Name</label>
                  <input
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Bank Account Number</label>
                  <input
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    className="form-input"
                    maxLength="10"
                  />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "💾 Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberProfile;
