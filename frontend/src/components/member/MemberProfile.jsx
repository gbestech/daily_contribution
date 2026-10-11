// src/components/member/MemberProfile.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

// ================================================================
// Custom dropdown — transparent, no background
// ================================================================
const Dropdown = ({
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  const handleSelect = (opt) => {
    if (disabled) return;
    onChange({ target: { name, value: opt.value } });
    setOpen(false);
  };

  const handleKey = (e) => {
    if (disabled) return;
    if (
      !open &&
      (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      setOpen(true);
      setHighlighted(0);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      handleSelect(options[highlighted]);
    }
  };

  return (
    <div className="pf-dropdown" ref={wrapRef}>
      <button
        type="button"
        className={`pf-dropdown-trigger ${open ? "open" : ""} ${
          !selected ? "empty" : ""
        } ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="pf-dropdown-value">
          {selected ? selected.label : placeholder || "Select…"}
        </span>
        <span className="pf-dropdown-arrow">▾</span>
      </button>

      {open && !disabled && (
        <ul className="pf-dropdown-menu" role="listbox">
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={`pf-dropdown-option ${
                value === opt.value ? "selected" : ""
              } ${i === highlighted ? "highlighted" : ""}`}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
            pointerEvents: "none",
          }}
          value={value || ""}
          onChange={() => {}}
          required
        />
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="pf-info-row">
    <div className="pf-info-label">{label}</div>
    <div className="pf-info-value">{value || "—"}</div>
  </div>
);

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const PLAN_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Random", label: "Random" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "Spouse", label: "Spouse" },
  { value: "Parent", label: "Parent" },
  { value: "Sibling", label: "Sibling" },
  { value: "Child", label: "Child" },
  { value: "Friend", label: "Friend" },
  { value: "Other", label: "Other" },
];

const SAVINGS_METHOD_OPTIONS = [
  { value: "Cash", label: "💵 Cash" },
  { value: "Item", label: "📦 Item" },
];

const DURATION_OPTIONS = [
  { value: "6 months", label: "6 Months" },
  { value: "1 year", label: "1 Year" },
  { value: "2 years", label: "2 Years" },
  { value: "3 years", label: "3 Years" },
  { value: "4 years", label: "4 Years (Maximum)" },
];

const DURATION_MONTHS = {
  "6 months": 6,
  "1 year": 12,
  "2 years": 24,
  "3 years": 36,
  "4 years": 48,
};

const PERIODS_PER_MONTH = {
  Daily: 30,
  Weekly: 4,
  Monthly: 1,
  Random: 1,
};

const formatMoney = (n) => {
  if (!n && n !== 0) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const ITEM_OPTIONS = [
  { value: "bag_of_rice", label: "Bag of Rice" },
  { value: "bag_of_beans", label: "Bag of Beans" },
  { value: "garri", label: "Garri" },
  { value: "palm_oil", label: "Palm Oil" },
  { value: "groundnut_oil", label: "Groundnut Oil" },
  { value: "soap", label: "Soap" },
  { value: "detergent", label: "Detergent" },
  { value: "tomatoes", label: "Tomatoes" },
  { value: "pepper", label: "Pepper" },
  { value: "onions", label: "Onions" },
  { value: "other", label: "Other (specify in notes)" },
];

const DRAFT_FIELDS = [
  "date_of_birth",
  "gender",
  "phone",
  "savings_plan",
  "savings_method",
  "item_name",
  "duration",
  "amount",
  "address",
  "next_of_kin_name",
  "next_of_kin_phone",
  "next_of_kin_relationship",
  "bank_name",
  "bank_account_number",
];

const MemberProfile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);

  const [profileConfirmedComplete, setProfileConfirmedComplete] =
    useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [itemOptions, setItemOptions] = useState(ITEM_OPTIONS);

  // ============================================================
  // 🆕 Role helpers — decide whether the savings section applies
  // ============================================================
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin = role === "admin" || role === "administrator";
  const isManager = role === "manager";
  // Savings plan only applies to regular members (not staff).
  const showSavingsSection = !isAdmin && !isManager;

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
    savings_method: "",
    item_name: "",
    duration: "",
    amount: "",
    bank_name: "",
    bank_account_number: "",
    passport_photo: "",
    profile_completed: 0,
    password: "",
    confirmPassword: "",
  });

  // 🆕 Resolve the member's branch_id from every available source.
  const getUserBranchId = () => {
    if (user?.branch_id !== undefined && user?.branch_id !== null) {
      return user.branch_id;
    }
    if (user?.branchId !== undefined && user?.branchId !== null) {
      return user.branchId;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored?.branch_id !== undefined && stored?.branch_id !== null) {
        return stored.branch_id;
      }
      if (stored?.branchId !== undefined && stored?.branchId !== null) {
        return stored.branchId;
      }
    } catch {}
    return null;
  };

  // ============================================================
  // Draft helpers
  // ============================================================
  const draftKey = user?.id ? `profile_draft_${user.id}` : null;

  const saveDraft = (data) => {
    if (!draftKey) return;
    try {
      const draft = {};
      DRAFT_FIELDS.forEach((f) => {
        draft[f] = data[f] ?? "";
      });
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {}
  };

  const loadDraft = () => {
    if (!draftKey) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const clearDraft = () => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  };

  // ============================================================
  // Live savings calculation
  // ============================================================
  const calculation = React.useMemo(() => {
    if (!showSavingsSection) return null;

    const plan = formData.savings_plan;
    const duration = formData.duration;
    const perPeriodAmount = parseFloat(formData.amount);

    if (
      !plan ||
      !duration ||
      isNaN(perPeriodAmount) ||
      perPeriodAmount <= 0 ||
      plan === "Random"
    ) {
      return null;
    }

    const months = DURATION_MONTHS[duration];
    const perMonth = PERIODS_PER_MONTH[plan];
    if (!months || !perMonth) return null;

    const totalPeriods = months * perMonth;
    const total = perPeriodAmount * totalPeriods;

    return {
      plan,
      duration,
      months,
      totalPeriods,
      perPeriod: perPeriodAmount,
      total,
      periodLabel:
        plan === "Daily"
          ? "per day"
          : plan === "Weekly"
            ? "per week"
            : "per month",
    };
  }, [
    formData.savings_plan,
    formData.duration,
    formData.amount,
    showSavingsSection,
  ]);

  // Fetch items (branch-scoped) — only for non-staff
  useEffect(() => {
    if (!showSavingsSection) return;

    let cancelled = false;
    const loadItems = async () => {
      try {
        const branchId = getUserBranchId();
        const url = branchId
          ? `${API_BASE_URL}/api/items.php?branch_id=${branchId}`
          : `${API_BASE_URL}/api/items.php`;

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.items || data.data || [];
        if (cancelled || !Array.isArray(list) || list.length === 0) return;
        setItemOptions(
          list.map((it) => ({
            value: it.slug || it.value || it.id || it.name,
            label: it.name || it.label || String(it),
          })),
        );
      } catch {}
    };
    loadItems();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSavingsSection]);

  const fetchFreshProfile = async (showToastFlag = false) => {
    if (!user?.id) {
      setLoadingProfile(false);
      return;
    }
    setSyncing(true);
    try {
      const userBranchId = getUserBranchId();
      const url = userBranchId
        ? `${API_BASE_URL}/api/members.php/${user.id}?branch_id=${userBranchId}`
        : `${API_BASE_URL}/api/members.php/${user.id}`;

      console.log("[MemberProfile] GET:", url);

      const res = await fetch(url);
      const data = await res.json();

      if (data.member) {
        const m = data.member;

        const serverData = {
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
          savings_method: m.savings_method || "",
          item_name: m.item_name || "",
          duration: m.duration || "",
          amount: m.amount || "",
          bank_name: m.bank_name || "",
          bank_account_number: m.bank_account_number || "",
          passport_photo: m.passport_photo || "",
          profile_completed: m.profile_completed || 0,
          password: "",
          confirmPassword: "",
        };

        const isComplete =
          m.profile_completed === 1 ||
          m.profile_completed === "1" ||
          m.profile_completed === true;

        let merged = serverData;
        if (!isComplete) {
          const draft = loadDraft();
          if (draft && typeof draft === "object") {
            merged = { ...serverData };
            DRAFT_FIELDS.forEach((f) => {
              if (
                draft[f] !== undefined &&
                draft[f] !== null &&
                draft[f] !== ""
              ) {
                merged[f] = draft[f];
              }
            });
          }
        } else {
          clearDraft();
        }

        setFormData(merged);

        if (m.passport_photo) {
          setPassportPreview(
            `${API_BASE_URL}/api/uploads/passports/${m.passport_photo}`,
          );
        }

        setProfileConfirmedComplete(isComplete);
        setShowCompletion(!isComplete);

        if (!isComplete && merged !== serverData) {
          toast.success("📝 Draft restored");
        }

        const updatedUser = {
          ...user,
          ...m,
          branch_id:
            m.branch_id ?? user?.branch_id ?? getUserBranchId() ?? null,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        if (showToastFlag) toast.success("✅ Refreshed");
      } else {
        setProfileConfirmedComplete(false);
        setShowCompletion(true);
      }
    } catch (e) {
      console.error("Fetch profile error:", e);
      if (showToastFlag) toast.error("Failed to sync");
    } finally {
      setSyncing(false);
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      setLoadingProfile(true);
      fetchFreshProfile(false);
    } else {
      setLoadingProfile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (showCompletion && !profileConfirmedComplete) {
      const touched = DRAFT_FIELDS.some(
        (f) =>
          formData[f] !== "" &&
          formData[f] !== null &&
          formData[f] !== undefined,
      );
      setHasUnsavedChanges(touched);
    } else {
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, showCompletion, profileConfirmedComplete]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "savings_method" && value !== "Item") {
      setFormData((prev) => {
        const next = { ...prev, savings_method: value, item_name: "" };
        if (showCompletion && !profileConfirmedComplete) saveDraft(next);
        return next;
      });
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (showCompletion && !profileConfirmedComplete) saveDraft(next);
      return next;
    });
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
    fd.append("file", passportFile);
    fd.append("image", passportFile);
    fd.append("memberId", user.id);
    fd.append("member_id", user.id);
    fd.append("id", user.id);

    const res = await fetch(`${API_BASE_URL}/api/upload_passport.php`, {
      method: "POST",
      body: fd,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Passport upload returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
      );
    }

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Upload failed (HTTP ${res.status})`,
      );
    }

    const filename =
      data.filename ||
      data.file ||
      data.passport_photo ||
      data.passportPhoto ||
      data.data?.filename ||
      data.data?.file ||
      null;

    if (!filename) {
      throw new Error(
        "Upload succeeded but server did not return a filename field",
      );
    }

    return filename;
  };

  const sendUpdate = async (payload) => {
    const userBranchId = getUserBranchId();
    const url = userBranchId
      ? `${API_BASE_URL}/api/members.php/${user.id}?branch_id=${userBranchId}`
      : `${API_BASE_URL}/api/members.php/${user.id}`;

    console.log("[MemberProfile] PUT:", url);

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Server returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
      );
    }

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          data.detail ||
          `Server rejected request (HTTP ${res.status})`,
      );
    }

    return data;
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();

    // ---------- Required fields ----------
    const required = [
      ["date_of_birth", "Date of Birth"],
      ["gender", "Gender"],
      ["phone", "Phone Number"],
      ["address", "Address"],
      ["next_of_kin_name", "Next of Kin Name"],
      ["next_of_kin_phone", "Next of Kin Phone"],
      ["next_of_kin_relationship", "Next of Kin Relationship"],
    ];

    // Savings fields only required for non-staff
    if (showSavingsSection) {
      required.push(
        ["savings_plan", "Savings Plan"],
        ["savings_method", "Savings Method"],
        ["duration", "Duration"],
        ["amount", "Amount"],
      );
    }

    for (const [k, label] of required) {
      if (!formData[k] || String(formData[k]).trim() === "") {
        toast.error(`${label} is required`);
        return;
      }
    }

    if (
      showSavingsSection &&
      formData.savings_method === "Item" &&
      !formData.item_name
    ) {
      toast.error("Please select the item you want to save for");
      return;
    }

    if (showSavingsSection && Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
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
        bank_name: formData.bank_name || "",
        bank_account_number: formData.bank_account_number || "",
        passport_photo: filename,
        profile_completed: 1,
      };

      // Only send savings fields for actual saving members
      if (showSavingsSection) {
        payload.savings_plan = formData.savings_plan;
        payload.savings_method = formData.savings_method;
        payload.item_name =
          formData.savings_method === "Item" ? formData.item_name : "";
        payload.duration = formData.duration;
        payload.amount = Number(formData.amount) || 0;
        payload.total_amount = calculation ? calculation.total : 0;
      }

      await sendUpdate(payload);

      clearDraft();
      setHasUnsavedChanges(false);

      const freshUser = { ...user, ...payload };
      localStorage.setItem("user", JSON.stringify(freshUser));
      login(freshUser, localStorage.getItem("token"));

      toast.success("🎉 Profile completed!");

      setPassportFile(null);
      setShowCompletion(false);
      setEditMode(false);

      setTimeout(() => {
        navigate("/member/dashboard", { replace: true });
      }, 400);
    } catch (err) {
      console.error("❌ Complete profile error:", err);
      toast.error(`❌ ${err.message || "Failed to save profile"}`);
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

      if (showSavingsSection) {
        payload.savings_plan = formData.savings_plan;
        payload.savings_method = formData.savings_method;
        payload.item_name =
          formData.savings_method === "Item" ? formData.item_name : "";
        payload.duration = formData.duration;
        payload.amount = Number(formData.amount) || 0;
        payload.total_amount = calculation ? calculation.total : 0;
      }

      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords don't match");
          setLoading(false);
          return;
        }
        payload.password = formData.password;
      }

      await sendUpdate(payload);

      const freshUser = { ...user, ...payload };
      localStorage.setItem("user", JSON.stringify(freshUser));
      login(freshUser, localStorage.getItem("token"));

      toast.success("✅ Profile updated!");
      setEditMode(false);
      await fetchFreshProfile(false);
    } catch (err) {
      console.error("❌ Update profile error:", err);
      toast.error(`❌ ${err.message || "Update failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const CalculationPreview = () => {
    if (!showSavingsSection || !calculation) return null;
    return (
      <div
        style={{
          marginBottom: "20px",
          padding: "16px 18px",
          border:
            "1px solid color-mix(in srgb, var(--pf-accent) 40%, transparent)",
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: "var(--pf-accent)",
            marginBottom: "10px",
          }}
        >
          💡 Savings Breakdown
        </div>
        <div className="pf-calc-row">
          <span>You pay {calculation.periodLabel}</span>
          <strong>{formatMoney(calculation.perPeriod)}</strong>
        </div>
        <div className="pf-calc-row">
          <span>Duration</span>
          <strong>{calculation.duration}</strong>
        </div>
        <div className="pf-calc-row">
          <span>Number of payments</span>
          <strong>{calculation.totalPeriods}</strong>
        </div>
        <div className="pf-calc-row pf-calc-highlight">
          <span>Total to save</span>
          <strong style={{ color: "var(--pf-accent)" }}>
            {formatMoney(calculation.total)}
          </strong>
        </div>
      </div>
    );
  };

  const itemLabel =
    itemOptions.find((o) => o.value === formData.item_name)?.label ||
    formData.item_name ||
    "—";

  const ProfileView = () => (
    <div>
      <div className="pf-header">
        <div>
          <h2>👤 My Profile</h2>
          <p>Your personal information and account details.</p>
        </div>
        <div className="pf-actions">
          <button
            className="pf-btn pf-btn-primary"
            onClick={() => setEditMode(true)}
          >
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      <div className="pf-view-avatar-wrap">
        <div className="pf-view-avatar">
          {passportPreview ? (
            <img src={passportPreview} alt={formData.name} />
          ) : (
            <div className="pf-passport-empty">👤</div>
          )}
        </div>
        <div className="pf-view-name">{formData.name || "—"}</div>
        <div className="pf-view-account">
          Account: <strong>{formData.accountNumber}</strong>
        </div>
        <div className="pf-view-badge">
          <span
            className={`pf-badge pf-badge-${(formData.status || "active").toLowerCase()}`}
          >
            {formData.status || "Active"}
          </span>
          <span className="pf-badge pf-badge-type">
            {formData.membershipType || "Standard"}
          </span>
        </div>
      </div>

      <div className="pf-section-title">🧑 Personal Information</div>
      <div className="pf-info-grid">
        <InfoRow label="Full Name" value={formData.name} />
        <InfoRow label="Email" value={formData.email} />
        <InfoRow label="Phone" value={formData.phone} />
        <InfoRow label="Gender" value={formData.gender} />
        <InfoRow
          label="Date of Birth"
          value={
            formData.date_of_birth
              ? new Date(formData.date_of_birth).toLocaleDateString("en-NG", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
        />
        <InfoRow
          label="Join Date"
          value={
            formData.joinDate
              ? new Date(formData.joinDate).toLocaleDateString("en-NG", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
        />
        <InfoRow label="Address" value={formData.address} />
      </div>

      <div className="pf-section-title">👥 Next of Kin</div>
      <div className="pf-info-grid">
        <InfoRow label="Full Name" value={formData.next_of_kin_name} />
        <InfoRow label="Phone" value={formData.next_of_kin_phone} />
        <InfoRow
          label="Relationship"
          value={formData.next_of_kin_relationship}
        />
      </div>

      {/* 🆕 Savings section only shown to regular saving members */}
      {showSavingsSection && (
        <>
          <div className="pf-section-title">💰 Savings</div>
          <div className="pf-info-grid">
            <InfoRow label="Savings Plan" value={formData.savings_plan} />
            <InfoRow label="Savings Method" value={formData.savings_method} />
            {formData.savings_method === "Item" && (
              <InfoRow label="Item" value={itemLabel} />
            )}
            <InfoRow label="Duration" value={formData.duration} />
            <InfoRow
              label="Amount per period"
              value={formData.amount ? formatMoney(formData.amount) : "—"}
            />
            {calculation && (
              <InfoRow
                label="Total to save"
                value={formatMoney(calculation.total)}
              />
            )}
          </div>
        </>
      )}

      <div className="pf-section-title">🏦 Bank Details</div>
      <div className="pf-info-grid">
        <InfoRow label="Bank Name" value={formData.bank_name} />
        <InfoRow label="Account Number" value={formData.bank_account_number} />
      </div>

      <div className="pf-balance-banner">
        <div className="pf-balance-label">Current Balance</div>
        <div className="pf-balance-value">{formatMoney(formData.balance)}</div>
      </div>
    </div>
  );

  if (loadingProfile) {
    return (
      <div className="profile-page">
        <style>{css}</style>
        <div className="pf-loading">
          <div className="pf-spinner" />
          <p>Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <style>{css}</style>

      {showCompletion && (
        <div>
          <div className="pf-header">
            <div>
              <h2>📝 Complete Your Profile</h2>
              <p>
                Account: <strong>{formData.accountNumber}</strong> — fill in the
                details below to activate your account.
              </p>
            </div>
          </div>

          <form onSubmit={handleCompleteProfile}>
            <div className="pf-passport-wrap">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="pf-passport-circle"
              >
                {passportPreview ? (
                  <img src={passportPreview} alt="Passport" />
                ) : (
                  <div className="pf-passport-empty">📷</div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePassportSelect}
                style={{ display: "none" }}
              />
              <p className="pf-passport-hint">
                Tap to upload passport photograph (required)
              </p>
            </div>

            <div className="pf-grid">
              <div>
                <label className="pf-label">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="pf-input"
                  required
                />
              </div>
              <div>
                <label className="pf-label">Gender *</label>
                <Dropdown
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                  required
                />
              </div>
            </div>

            <div className="pf-grid">
              <div>
                <label className="pf-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const next = {
                        ...prev,
                        phone: e.target.value.replace(/\D/g, ""),
                      };
                      if (showCompletion && !profileConfirmedComplete)
                        saveDraft(next);
                      return next;
                    })
                  }
                  className="pf-input"
                  maxLength="11"
                  placeholder="08012345678"
                  required
                />
              </div>

              {/* 🆕 Savings Plan only for regular members */}
              {showSavingsSection && (
                <div>
                  <label className="pf-label">Savings Plan *</label>
                  <Dropdown
                    name="savings_plan"
                    value={formData.savings_plan}
                    onChange={handleChange}
                    options={PLAN_OPTIONS}
                    placeholder="Choose plan"
                    required
                  />
                </div>
              )}
            </div>

            {/* 🆕 Savings Method / Item / Duration / Amount — hidden for staff */}
            {showSavingsSection && (
              <>
                <div className="pf-grid">
                  <div>
                    <label className="pf-label">Savings Method *</label>
                    <Dropdown
                      name="savings_method"
                      value={formData.savings_method}
                      onChange={handleChange}
                      options={SAVINGS_METHOD_OPTIONS}
                      placeholder="Cash or Item?"
                      required
                    />
                  </div>

                  {formData.savings_method === "Item" && (
                    <div>
                      <label className="pf-label">Select Item *</label>
                      <Dropdown
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleChange}
                        options={itemOptions}
                        placeholder="Choose item"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="pf-grid">
                  <div>
                    <label className="pf-label">Duration of Saving *</label>
                    <Dropdown
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      options={DURATION_OPTIONS}
                      placeholder="Choose duration"
                      required
                    />
                  </div>
                  <div>
                    <label className="pf-label">
                      Amount per{" "}
                      {formData.savings_plan === "Daily"
                        ? "day"
                        : formData.savings_plan === "Weekly"
                          ? "week"
                          : formData.savings_plan === "Monthly"
                            ? "month"
                            : "period"}{" "}
                      (₦) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      className="pf-input"
                      min="1"
                      step="0.01"
                      placeholder="e.g., 2000"
                      required
                    />
                  </div>
                </div>

                <CalculationPreview />
              </>
            )}

            <div className="pf-field">
              <label className="pf-label">Residential Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="pf-textarea"
                placeholder="Enter your full residential address"
                required
              />
            </div>

            <div className="pf-section-title">👥 Next of Kin</div>
            <div className="pf-grid">
              <div>
                <label className="pf-label">Full Name *</label>
                <input
                  type="text"
                  name="next_of_kin_name"
                  value={formData.next_of_kin_name}
                  onChange={handleChange}
                  className="pf-input"
                  placeholder="Next of kin name"
                  required
                />
              </div>
              <div>
                <label className="pf-label">Phone Number *</label>
                <input
                  type="tel"
                  name="next_of_kin_phone"
                  value={formData.next_of_kin_phone}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const next = {
                        ...prev,
                        next_of_kin_phone: e.target.value.replace(/\D/g, ""),
                      };
                      if (showCompletion && !profileConfirmedComplete)
                        saveDraft(next);
                      return next;
                    })
                  }
                  className="pf-input"
                  maxLength="11"
                  placeholder="08012345678"
                  required
                />
              </div>
              <div className="pf-span-2">
                <label className="pf-label">Relationship *</label>
                <Dropdown
                  name="next_of_kin_relationship"
                  value={formData.next_of_kin_relationship}
                  onChange={handleChange}
                  options={RELATIONSHIP_OPTIONS}
                  placeholder="Select relationship"
                  required
                />
              </div>
            </div>

            <div className="pf-section-title">🏦 Bank Details (Optional)</div>
            <div className="pf-grid">
              <div>
                <label className="pf-label">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="pf-input"
                  placeholder="e.g., GTBank"
                />
              </div>
              <div>
                <label className="pf-label">Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const next = {
                        ...prev,
                        bank_account_number: e.target.value.replace(/\D/g, ""),
                      };
                      if (showCompletion && !profileConfirmedComplete)
                        saveDraft(next);
                      return next;
                    })
                  }
                  className="pf-input"
                  maxLength="10"
                  placeholder="10 digits"
                />
              </div>
            </div>

            <button
              type="submit"
              className="pf-btn pf-btn-primary pf-btn-block"
              disabled={loading}
            >
              {loading ? "Saving..." : "✅ Complete Profile"}
            </button>
          </form>
        </div>
      )}

      {!showCompletion && !editMode && <ProfileView />}

      {!showCompletion && editMode && (
        <div>
          <div className="pf-header">
            <div>
              <h2>✏️ Edit Your Profile</h2>
              <p>Update your details below and save.</p>
            </div>
            <div className="pf-actions">
              <button
                className="pf-btn pf-btn-ghost"
                onClick={() => setEditMode(false)}
              >
                ✕ Cancel
              </button>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="pf-grid">
              <div>
                <label className="pf-label">Full Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pf-input"
                />
              </div>
              <div>
                <label className="pf-label">Email</label>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pf-input"
                />
              </div>
              <div>
                <label className="pf-label">Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="pf-input"
                  maxLength="11"
                />
              </div>

              {/* 🆕 Savings fields only for regular members */}
              {showSavingsSection && (
                <>
                  <div>
                    <label className="pf-label">Savings Plan</label>
                    <Dropdown
                      name="savings_plan"
                      value={formData.savings_plan}
                      onChange={handleChange}
                      options={PLAN_OPTIONS}
                      placeholder="Choose plan"
                    />
                  </div>
                  <div>
                    <label className="pf-label">Savings Method</label>
                    <Dropdown
                      name="savings_method"
                      value={formData.savings_method}
                      onChange={handleChange}
                      options={SAVINGS_METHOD_OPTIONS}
                      placeholder="Cash or Item?"
                    />
                  </div>
                  {formData.savings_method === "Item" && (
                    <div>
                      <label className="pf-label">Item</label>
                      <Dropdown
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleChange}
                        options={itemOptions}
                        placeholder="Choose item"
                      />
                    </div>
                  )}
                  <div>
                    <label className="pf-label">Duration of Saving</label>
                    <Dropdown
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      options={DURATION_OPTIONS}
                      placeholder="Choose duration"
                    />
                  </div>
                  <div>
                    <label className="pf-label">Amount per period (₦)</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      className="pf-input"
                      min="1"
                      step="0.01"
                      placeholder="e.g., 2000"
                    />
                  </div>
                </>
              )}

              <div className="pf-span-2">
                <label className="pf-label">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="pf-textarea"
                />
              </div>
              <div>
                <label className="pf-label">Bank Name</label>
                <input
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="pf-input"
                />
              </div>
              <div>
                <label className="pf-label">Bank Account Number</label>
                <input
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  className="pf-input"
                  maxLength="10"
                />
              </div>
              <div>
                <label className="pf-label">New Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pf-input"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="pf-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pf-input"
                />
              </div>
            </div>

            <CalculationPreview />

            <div className="pf-form-actions">
              <button
                type="submit"
                className="pf-btn pf-btn-primary"
                disabled={loading}
              >
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                type="button"
                className="pf-btn pf-btn-ghost"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const css = `
  .profile-page {
    padding: 24px;
    max-width: 900px;
    margin: 0 auto;
    font-family: system-ui, -apple-system, sans-serif;

    color: #0f172a !important;
    --pf-text: #0f172a;
    --pf-text-muted: #64748b;
    --pf-text-dim: #94a3b8;
    --pf-border: #e2e8f0;
    --pf-accent: #059669;
    --pf-highlight: rgba(5, 150, 105, 0.12);
  }

  @media (prefers-color-scheme: dark) {
    .profile-page {
      color: #e2e8f0 !important;
      --pf-text: #e2e8f0;
      --pf-text-muted: #94a3b8;
      --pf-text-dim: #64748b;
      --pf-border: #334155;
      --pf-highlight: rgba(16, 185, 129, 0.18);
    }
  }

  [data-theme="dark"] .profile-page,
  .dark .profile-page {
    color: #e2e8f0 !important;
    --pf-text: #e2e8f0;
    --pf-text-muted: #94a3b8;
    --pf-text-dim: #64748b;
    --pf-border: #334155;
    --pf-highlight: rgba(16, 185, 129, 0.18);
  }

  [data-theme="light"] .profile-page,
  .light .profile-page {
    color: #0f172a !important;
    --pf-text: #0f172a;
    --pf-text-muted: #64748b;
    --pf-text-dim: #94a3b8;
    --pf-border: #e2e8f0;
    --pf-highlight: rgba(5, 150, 105, 0.12);
  }

  .pf-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: var(--pf-text-muted);
    font-size: 14px;
    gap: 16px;
  }
  .pf-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--pf-border);
    border-top-color: var(--pf-accent);
    border-radius: 50%;
    animation: pf-spin 0.9s linear infinite;
  }
  @keyframes pf-spin {
    to { transform: rotate(360deg); }
  }

  .pf-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--pf-border);
  }
  .pf-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--pf-text) !important;
  }
  .pf-header p {
    margin: 4px 0 0;
    color: var(--pf-text-muted) !important;
    font-size: 14px;
  }
  .pf-header p strong {
    color: var(--pf-text) !important;
  }
  .pf-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .pf-view-avatar-wrap {
    text-align: center;
    padding: 20px 0 24px 0;
    border-bottom: 1px solid var(--pf-border);
    margin-bottom: 24px;
  }
  .pf-view-avatar {
    display: inline-block;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--pf-border);
    background: transparent;
  }
  .pf-view-avatar img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .pf-view-name {
    margin-top: 14px;
    font-size: 20px;
    font-weight: 700;
    color: var(--pf-text);
  }
  .pf-view-account {
    margin-top: 4px;
    font-size: 13px;
    color: var(--pf-text-muted);
  }
  .pf-view-account strong {
    color: var(--pf-text);
    font-family: monospace;
    letter-spacing: 0.5px;
  }
  .pf-view-badge {
    margin-top: 12px;
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pf-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .pf-badge-active {
    background: rgba(16, 185, 129, 0.15);
    color: var(--pf-accent);
  }
  .pf-badge-inactive {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }
  .pf-badge-suspended {
    background: rgba(234, 179, 8, 0.15);
    color: #eab308;
  }
  .pf-badge-type {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .pf-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
    margin-bottom: 8px;
  }
  .pf-info-row {
    padding: 10px 0;
    border-bottom: 1px dashed var(--pf-border);
    min-width: 0;
  }
  .pf-info-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--pf-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 4px;
  }
  .pf-info-value {
    font-size: 14px;
    color: var(--pf-text);
    word-break: break-word;
    line-height: 1.4;
  }

  .pf-balance-banner {
    margin-top: 28px;
    padding: 20px;
    border: 1px solid color-mix(in srgb, var(--pf-accent) 35%, transparent);
    border-radius: 12px;
    text-align: center;
  }
  .pf-balance-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--pf-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .pf-balance-value {
    font-size: 26px;
    font-weight: 700;
    color: var(--pf-accent);
  }

  .pf-input, .pf-textarea {
    width: 100%;
    color: var(--pf-text) !important;
    background: transparent !important;
    padding: 9px 0;
    border: none;
    border-bottom: 1px solid var(--pf-border);
    border-radius: 0;
    outline: none;
    font-size: 14px;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.2s;
    -webkit-text-fill-color: var(--pf-text);
  }
  .pf-input:focus,
  .pf-textarea:focus,
  .pf-input:focus-visible,
  .pf-textarea:focus-visible {
    border-bottom-color: var(--pf-accent);
    color: var(--pf-text) !important;
    outline: none;
    box-shadow: none;
  }
  .pf-input::placeholder,
  .pf-textarea::placeholder {
    color: var(--pf-text-dim) !important;
    opacity: 1;
  }
  .pf-textarea {
    min-height: 60px;
    resize: vertical;
  }

  .pf-dropdown {
    position: relative;
    width: 100%;
  }
  .pf-dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 0;
    background: transparent !important;
    color: var(--pf-text) !important;
    border: none;
    border-bottom: 1px solid var(--pf-border);
    border-radius: 0;
    font-size: 14px;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color 0.2s;
    outline: none;
    -webkit-text-fill-color: var(--pf-text);
  }
  .pf-dropdown-trigger.empty .pf-dropdown-value {
    color: var(--pf-text-dim) !important;
    -webkit-text-fill-color: var(--pf-text-dim);
  }
  .pf-dropdown-trigger.open,
  .pf-dropdown-trigger:focus-visible {
    border-bottom-color: var(--pf-accent);
  }
  .pf-dropdown-value {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: inherit !important;
  }
  .pf-dropdown-arrow {
    color: var(--pf-text-muted) !important;
    font-size: 12px;
    transition: transform 0.15s;
  }
  .pf-dropdown-trigger.open .pf-dropdown-arrow {
    transform: rotate(180deg);
  }
  .pf-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 50;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    background: transparent !important;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--pf-border);
    border-radius: 8px;
    max-height: 240px;
    overflow-y: auto;
  }
  .pf-dropdown-option {
    padding: 9px 12px;
    font-size: 14px;
    color: var(--pf-text) !important;
    cursor: pointer;
    user-select: none;
  }
  .pf-dropdown-option.highlighted {
    background-color: var(--pf-highlight) !important;
  }
  .pf-dropdown-option.selected {
    color: var(--pf-accent) !important;
    font-weight: 700;
  }

  .pf-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--pf-text-muted) !important;
    margin-bottom: 2px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .pf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px 24px;
    margin-bottom: 20px;
  }
  .pf-span-2 { grid-column: 1 / -1; }
  .pf-field { margin-bottom: 20px; }

  .pf-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--pf-text-muted) !important;
    margin: 24px 0 12px;
    padding-top: 12px;
    border-top: 1px solid var(--pf-border);
  }

  .pf-calc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    font-size: 13px;
    color: var(--pf-text);
  }
  .pf-calc-row span { color: var(--pf-text-muted); }
  .pf-calc-row strong {
    color: var(--pf-text);
    font-weight: 600;
  }
  .pf-calc-highlight {
    border-top: 1px solid var(--pf-border);
    margin-top: 6px;
    padding-top: 10px;
  }
  .pf-calc-highlight strong { font-size: 15px; }

  .pf-passport-wrap {
    text-align: center;
    margin-bottom: 28px;
  }
  .pf-passport-circle {
    display: inline-block;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    border: 1px solid var(--pf-border);
    background: transparent;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .pf-passport-circle:hover { border-color: var(--pf-accent); }
  .pf-passport-circle img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .pf-passport-empty {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    color: var(--pf-text-muted) !important;
  }
  .pf-passport-hint {
    color: var(--pf-text-muted) !important;
    font-size: 12px;
    margin-top: 8px;
  }

  .pf-btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    transition: all 0.2s;
    outline: none;
  }
  .pf-btn-primary {
    color: var(--pf-accent) !important;
    border-color: color-mix(in srgb, var(--pf-accent) 40%, transparent);
  }
  .pf-btn-primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--pf-accent) 10%, transparent);
  }
  .pf-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .pf-btn-ghost {
    color: var(--pf-text-muted) !important;
    border-color: var(--pf-border);
  }
  .pf-btn-ghost:hover {
    background: var(--pf-highlight);
    color: var(--pf-text) !important;
  }
  .pf-btn-block {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
  }

  .pf-form-actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid var(--pf-border);
  }

  @media (max-width: 640px) {
    .profile-page { padding: 16px; }
    .pf-grid { grid-template-columns: 1fr; }
    .pf-info-grid { grid-template-columns: 1fr; }
    .pf-view-name { font-size: 18px; }
    .pf-balance-value { font-size: 22px; }
  }
`;

export default MemberProfile;
