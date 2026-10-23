// src/components/admin/UserManagement.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";

const API_BASE_URL = "https://baleeg.onrender.com";

const capitalizeWords = (str) =>
  String(str || "")
    .split(" ")
    .map((w) =>
      w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "",
    )
    .join(" ");

const pickMemberName = (m) =>
  m?.name ||
  m?.full_name ||
  m?.fullName ||
  m?.member_name ||
  m?.memberName ||
  m?.display_name ||
  m?.displayName ||
  (m?.first_name || m?.firstName
    ? `${m.firstName || m.first_name || ""} ${m.lastName || m.last_name || ""}`.trim()
    : "") ||
  (m?.id ? `Member #${m.id}` : "");

const AdminMembers = ({ publicMode = false }) => {
  const navigate = useNavigate();
  const { activeBranch, activeBranchId } = useBranch();

  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleAssignment, setRoleAssignment] = useState({
    memberId: "",
    role: "member",
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const fileInputRef = useRef(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkActionRunning, setBulkActionRunning] = useState(false);

  // ✅ NEW: resolved branch info from API if context doesn't have it
  const [branchInfo, setBranchInfo] = useState(null);

  const branchId = useMemo(() => {
    if (
      activeBranchId !== undefined &&
      activeBranchId !== null &&
      String(activeBranchId).trim() !== ""
    ) {
      const n = Number(activeBranchId);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (activeBranch?.id) {
      const n = Number(activeBranch.id);
      if (Number.isFinite(n) && n > 0) return n;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored?.branch_id) {
        const n = Number(stored.branch_id);
        if (Number.isFinite(n) && n > 0) return n;
      }
      if (stored?.branchId) {
        const n = Number(stored.branchId);
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch {}
    return null;
  }, [activeBranchId, activeBranch]);

  // ✅ NEW: resolve branch name/code — fetches from API if context lacks it
  useEffect(() => {
    if (!branchId) return;
    if (activeBranch?.name && activeBranch?.code) {
      setBranchInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(
          `/api/get-branch.php?id=${encodeURIComponent(branchId)}`,
        );
        const b = data?.branch || data?.data?.branch || data?.data || data;
        if (!cancelled && b && typeof b === "object") {
          setBranchInfo({
            id: b.id ?? branchId,
            name: b.name ?? b.branch_name ?? "",
            code: b.code ?? b.branch_code ?? "",
          });
        }
      } catch (err) {
        console.warn("[UserManagement] get-branch fallback failed:", err);
        if (!cancelled) setBranchInfo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, activeBranch?.name, activeBranch?.code]);

  // ✅ NEW: resolved values used in the banner
  const resolvedBranchName = useMemo(() => {
    if (activeBranch?.name && String(activeBranch.name).trim())
      return String(activeBranch.name).trim();
    if (activeBranch?.branch_name && String(activeBranch.branch_name).trim())
      return String(activeBranch.branch_name).trim();
    if (branchInfo?.name && String(branchInfo.name).trim())
      return String(branchInfo.name).trim();
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const n = stored?.branch_name || stored?.branchName;
      if (n && String(n).trim()) return String(n).trim();
    } catch {}
    return branchId ? `Branch #${branchId}` : "Branch";
  }, [activeBranch, branchInfo, branchId]);

  const resolvedBranchCode = useMemo(() => {
    if (activeBranch?.code && String(activeBranch.code).trim())
      return String(activeBranch.code).trim();
    if (activeBranch?.branch_code && String(activeBranch.branch_code).trim())
      return String(activeBranch.branch_code).trim();
    if (branchInfo?.code && String(branchInfo.code).trim())
      return String(branchInfo.code).trim();
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const c = stored?.branch_code || stored?.branchCode;
      if (c && String(c).trim()) return String(c).trim();
    } catch {}
    return "—";
  }, [activeBranch, branchInfo]);

  const generateAccountNumber = () => {
    const prefix = "10";
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    return prefix + randomDigits;
  };

  const generateRandomNumber = () => Math.floor(Math.random() * 90000) + 10000;

  useEffect(() => {
    const firstName = newMember.firstName.trim().toLowerCase();
    if (firstName) {
      const randomNum = generateRandomNumber();
      const email = `${firstName}${randomNum}@gmail.com`;
      setNewMember((prev) => ({ ...prev, email }));
    } else {
      setNewMember((prev) => ({ ...prev, email: "" }));
    }
  }, [newMember.firstName]);

  useEffect(() => {
    if (publicMode) {
      setLoading(false);
      return;
    }
    if (branchId === null) {
      setMembers([]);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setSearchTerm("");
    setSelectedIds(new Set());
    setLastError(null);
    fetchMembers();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, publicMode]);

  const fetchMembers = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const url = branchId
        ? `/api/members.php?branch_id=${encodeURIComponent(branchId)}`
        : "/api/members.php";

      const body = await apiFetch(url);

      const list = Array.isArray(body?.members) ? body.members : [];
      setMembers(
        list.map((m) => ({
          id: m.id,
          membership_number:
            m.accountNumber ||
            m.account_number ||
            m.membership_number ||
            `MEM-${String(m.id).padStart(4, "0")}`,
          full_name: pickMemberName(m),
          email: m.email || "",
          phone: m.phone || "",
          balance: parseFloat(m.balance) || 0,
          status: (m.status || "active").toLowerCase(),
          join_date:
            m.joinDate || m.join_date || new Date().toISOString().split("T")[0],
          role: m.role || "member",
          profile_completed: m.profile_completed || 0,
          passport_photo: m.passport_photo || null,
          branch_id: m.branch_id || m.branchId || null,
        })),
      );
    } catch (e) {
      console.error("[Members] fetch exception:", e);
      setLastError(e.message || "Network error");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const url = branchId
        ? `/api/transactions.php?branch_id=${encodeURIComponent(branchId)}`
        : "/api/transactions.php";

      const body = await apiFetch(url);

      const list = Array.isArray(body?.transactions) ? body.transactions : [];
      setTransactions(
        list.map((t) => ({
          id: t.id,
          member_id: t.memberId,
          transaction_type: t.type,
          amount: t.amount,
          charge: t.charge || 0,
          status: t.status,
          description: t.description || "",
          created_at: t.date,
        })),
      );
    } catch (e) {
      setTransactions([]);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setLastError(null);
    try {
      await Promise.all([fetchMembers(), fetchTransactions()]);
      toast.success("🔄 Members refreshed");
    } catch (e) {
      toast.error(e.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.password || newMember.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      const fullName = capitalizeWords(
        `${newMember.firstName.trim()} ${newMember.lastName.trim()}`.trim(),
      );
      const accountNumber = generateAccountNumber();

      const payload = {
        accountNumber,
        account_number: accountNumber,
        name: fullName,
        full_name: fullName,
        fullName: fullName,
        email: newMember.email,
        phone: "",
        password: newMember.password,
        role: "member",
        status: "Active",
        membership_type: "Standard",
        join_date: new Date().toISOString().split("T")[0],
        balance: 0,
        profile_completed: 0,
        ...(branchId ? { branch_id: branchId } : {}),
      };

      const response = await apiFetch(
        branchId
          ? `/api/members.php?branch_id=${encodeURIComponent(branchId)}`
          : "/api/members.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const createdName =
        pickMemberName(response?.member) ||
        pickMemberName(response) ||
        fullName;

      setCreatedCredentials({
        name: createdName,
        email: newMember.email,
        password: newMember.password,
        accountNumber,
      });

      setShowAddModal(false);
      setShowCredentialsModal(true);
      setNewMember({ firstName: "", lastName: "", email: "", password: "" });
      if (!publicMode) fetchMembers();
    } catch (e) {
      toast.error(e.message || "Failed to create member");
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`📋 ${label} copied!`))
      .catch(() => toast.error("Copy failed"));
  };

  const copyAllCredentials = () => {
    if (!createdCredentials) return;
    const text = `Welcome ${createdCredentials.name}!
Your account details:
📧 Email: ${createdCredentials.email}
🔑 Password: ${createdCredentials.password}
💳 Account Number: ${createdCredentials.accountNumber}

Please log in and complete your profile.`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("📋 All credentials copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  const handleEditMember = (m) => {
    setSelectedMember({
      ...m,
      full_name: pickMemberName(m) || m.full_name || "",
    });
    setEditPassword("");
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    const payload = {
      name: capitalizeWords(
        selectedMember.full_name || selectedMember.name || "",
      ),
      email: selectedMember.email,
      phone: selectedMember.phone || "",
      balance: parseFloat(selectedMember.balance) || 0,
      status: selectedMember.status,
      role: selectedMember.role,
    };
    if (editPassword.trim()) payload.password = editPassword.trim();

    try {
      await apiFetch(
        branchId
          ? `/api/members.php/${selectedMember.id}?branch_id=${encodeURIComponent(branchId)}`
          : `/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      toast.success("✅ Member updated!");
      setShowEditModal(false);
      setSelectedMember(null);
      setEditPassword("");
      fetchMembers();
    } catch (e) {
      toast.error(e.message || "Failed to update");
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("Delete this member?")) return;
    try {
      await apiFetch(
        branchId
          ? `/api/members.php/${id}?branch_id=${encodeURIComponent(branchId)}`
          : `/api/members.php/${id}`,
        { method: "DELETE" },
      );
      toast.success("✅ Deleted!");
      fetchMembers();
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleAssignRole = async () => {
    if (!roleAssignment.memberId) {
      toast.error("Please select a member");
      return;
    }
    const m = members.find((x) => x.id === parseInt(roleAssignment.memberId));
    try {
      await apiFetch(
        branchId
          ? `/api/members.php/${roleAssignment.memberId}?branch_id=${encodeURIComponent(branchId)}`
          : `/api/members.php/${roleAssignment.memberId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: roleAssignment.role,
            name: pickMemberName(m),
            email: m?.email,
            phone: m?.phone || "",
            status: m?.status,
            balance: m?.balance || 0,
          }),
        },
      );
      toast.success(`✅ Role assigned: ${roleAssignment.role}`);
      setShowRoleModal(false);
      setRoleAssignment({ memberId: "", role: "member" });
      fetchMembers();
    } catch (e) {
      toast.error(e.message || "Failed to assign role");
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { "First Name": "John", "Last Name": "Doe", Password: "john1234" },
      { "First Name": "Jane", "Last Name": "Smith", Password: "jane1234" },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
    XLSX.writeFile(workbook, "members_upload_template.xlsx");
    toast.success("📥 Template downloaded!");
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!json.length) {
          toast.error("Excel file is empty");
          return;
        }

        const normalized = json.map((row, idx) => {
          const get = (key) => {
            const found = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === key.toLowerCase(),
            );
            return found ? String(row[found]).trim() : "";
          };
          return {
            _row: idx + 2,
            firstName: get("First Name"),
            lastName: get("Last Name"),
            password: get("Password"),
          };
        });

        const validated = normalized.map((r) => {
          const errors = [];
          if (!r.firstName) errors.push("First Name required");
          if (!r.lastName) errors.push("Last Name required");
          if (!r.password) errors.push("Password required");
          else if (r.password.length < 6)
            errors.push("Password must be ≥ 6 characters");
          return { ...r, errors };
        });

        setBulkRows(validated);
        setBulkResults(null);
        setShowBulkModal(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to read Excel file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const generateEmail = (firstName) => {
    const firstNameLower = firstName.trim().toLowerCase();
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    return `${firstNameLower}${randomNum}@gmail.com`;
  };

  const handleBulkUpload = async () => {
    const validRows = bulkRows.filter((r) => r.errors.length === 0);
    if (!validRows.length) {
      toast.error("No valid rows to upload");
      return;
    }

    setBulkUploading(true);
    const results = [];

    for (const row of validRows) {
      try {
        const fullName = capitalizeWords(
          `${row.firstName} ${row.lastName}`.trim(),
        );
        const email = generateEmail(row.firstName);
        const accountNumber = generateAccountNumber();

        const payload = {
          accountNumber,
          account_number: accountNumber,
          name: fullName,
          full_name: fullName,
          fullName: fullName,
          email,
          phone: "",
          password: row.password,
          role: "member",
          status: "Active",
          membership_type: "Standard",
          join_date: new Date().toISOString().split("T")[0],
          balance: 0,
          profile_completed: 0,
          ...(branchId ? { branch_id: branchId } : {}),
        };

        await apiFetch(
          branchId
            ? `/api/members.php?branch_id=${encodeURIComponent(branchId)}`
            : "/api/members.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        results.push({
          row: row._row,
          name: fullName,
          email,
          password: row.password,
          accountNumber,
          status: "success",
        });
      } catch (err) {
        results.push({
          row: row._row,
          name: `${row.firstName} ${row.lastName}`,
          email: "",
          status: "failed",
          error: err.message || "Network error",
        });
      }
    }

    setBulkResults(results);
    setBulkUploading(false);

    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.filter((r) => r.status === "failed").length;

    if (successCount) toast.success(`✅ ${successCount} member(s) created!`);
    if (failCount) toast.error(`⚠️ ${failCount} row(s) failed`);

    fetchMembers();
  };

  const downloadBulkResults = () => {
    if (!bulkResults?.length) return;

    const data = bulkResults.map((r) => ({
      Row: r.row,
      Name: r.name,
      Email: r.email || "—",
      Password: r.password || "—",
      "Account Number": r.accountNumber || "—",
      Status: r.status === "success" ? "Success" : "Failed",
      Error: r.error || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
      { wch: 24 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(
      workbook,
      `members_upload_results_${resolvedBranchCode || "branch"}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`,
    );
    toast.success("📥 Results downloaded!");
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.membership_number || "").includes(searchTerm) ||
      (m.phone || "").includes(searchTerm),
  );

  const allVisibleIds = useMemo(
    () => filteredMembers.map((m) => m.id),
    [filteredMembers],
  );

  const allVisibleSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));

  const someVisibleSelected =
    allVisibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.has(m.id)),
    [members, selectedIds],
  );

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    if (
      !window.confirm(
        `⚠️ Delete ${selectedMembers.length} member(s)? This cannot be undone.`,
      )
    )
      return;

    setBulkActionRunning(true);
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const m of selectedMembers) {
      try {
        await apiFetch(
          branchId
            ? `/api/members.php/${m.id}?branch_id=${encodeURIComponent(branchId)}`
            : `/api/members.php/${m.id}`,
          { method: "DELETE" },
        );
        success++;
      } catch (err) {
        failed++;
        errors.push(`${m.full_name}: ${err.message}`);
      }
    }

    setBulkActionRunning(false);

    if (success) toast.success(`🗑️ ${success} member(s) deleted`);
    if (failed)
      toast.error(
        `❌ ${failed} failed${errors.length ? `\n${errors.slice(0, 3).join("\n")}` : ""}`,
        { duration: 8000 },
      );

    clearSelection();
    fetchMembers();
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedMembers.length === 0) return;
    if (
      !window.confirm(
        `Set ${selectedMembers.length} member(s) to "${newStatus.toUpperCase()}"?`,
      )
    )
      return;

    setBulkActionRunning(true);
    let success = 0;
    let failed = 0;

    for (const m of selectedMembers) {
      try {
        await apiFetch(
          branchId
            ? `/api/members.php/${m.id}?branch_id=${encodeURIComponent(branchId)}`
            : `/api/members.php/${m.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pickMemberName(m),
              email: m.email,
              phone: m.phone || "",
              role: m.role,
              balance: m.balance || 0,
              status: newStatus,
            }),
          },
        );
        success++;
      } catch {
        failed++;
      }
    }

    setBulkActionRunning(false);
    if (success) toast.success(`✅ ${success} member(s) updated`);
    if (failed) toast.error(`❌ ${failed} failed`);

    clearSelection();
    fetchMembers();
  };

  const getRoleColor = (role) => {
    const r = String(role || "").toLowerCase();
    switch (r) {
      case "admin":
      case "administrator":
        return {
          bg: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          color: "#ffffff",
          border: "1px solid #a78bfa",
        };
      case "manager":
        return {
          bg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          color: "#ffffff",
          border: "1px solid #60a5fa",
        };
      case "member":
      default:
        return {
          bg: "linear-gradient(135deg, #059669, #047857)",
          color: "#ffffff",
          border: "1px solid #34d399",
        };
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "active":
        return {
          bg: "linear-gradient(135deg, #10b981, #059669)",
          color: "#ffffff",
          border: "1px solid #34d399",
        };
      case "inactive":
        return {
          bg: "linear-gradient(135deg, #ef4444, #dc2626)",
          color: "#ffffff",
          border: "1px solid #f87171",
        };
      case "suspended":
        return {
          bg: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "#ffffff",
          border: "1px solid #fbbf24",
        };
      default:
        return {
          bg: "linear-gradient(135deg, #6b7280, #4b5563)",
          color: "#ffffff",
          border: "1px solid #9ca3af",
        };
    }
  };

  // PUBLIC MODE
  if (publicMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, var(--bg-surface) 0%, var(--bg-app) 60%)",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <style>{`
          .pub-card { width: 100%; max-width: 440px; background: var(--bg-surface); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 20px; padding: 36px 30px 28px; box-shadow: var(--shadow-lg); position: relative; overflow: hidden; color: var(--text); }
          .pub-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #059669, #0d9488, var(--accent)); }
          .pub-logo { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #059669, #0d9488); display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; margin: 0 auto 14px; box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4); }
          .pub-title { font-size: 22px; font-weight: 700; color: var(--text); text-align: center; margin: 0 0 4px 0; letter-spacing: -0.3px; }
          .pub-subtitle { font-size: 13px; color: var(--text-muted); text-align: center; margin: 0 0 22px 0; }
          .pub-info { background: var(--accent-bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px; color: var(--text); line-height: 1.5; }
          .pub-group { margin-bottom: 14px; }
          .pub-label { display: block; font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 6px; letter-spacing: 0.3px; text-transform: uppercase; }
          .pub-input { width: 100%; padding: 12px 14px; font-size: 14px; color: var(--text) !important; -webkit-text-fill-color: var(--text) !important; background: var(--bg-surface-2) !important; border: 1px solid var(--border); border-radius: 10px; outline: none; box-sizing: border-box; transition: all 0.2s; }
          .pub-input::placeholder { color: var(--text-dim) !important; -webkit-text-fill-color: var(--text-dim) !important; opacity: 1; }
          .pub-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
          .pub-email-note { background: var(--approved-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: var(--text); word-break: break-all; }
          .pub-submit { width: 100%; padding: 13px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; color: white; cursor: pointer; background: linear-gradient(135deg, #059669, #0d9488); box-shadow: 0 8px 24px -8px rgba(5, 150, 105, 0.5); transition: all 0.2s; margin-top: 6px; }
          .pub-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px -8px rgba(5, 150, 105, 0.7); }
          .pub-submit:disabled { opacity: 0.6; cursor: not-allowed; }
          .pub-footer { text-align: center; margin-top: 20px; font-size: 13px; color: var(--text-muted); }
          .pub-footer a { color: var(--accent); text-decoration: none; font-weight: 600; }
          .pub-footer a:hover { text-decoration: underline; }
          .pub-note { text-align: center; font-size: 10px; color: var(--text-dim); margin-top: 18px; }
        `}</style>

        <div className="pub-card">
          <div className="pub-logo">🏦</div>
          <h1 className="pub-title">Create Account</h1>
          <p className="pub-subtitle">Join AR-RIYAADAH SAVINGS HUB</p>

          <div className="pub-info">
            💡 Enter your details below. You'll receive your account number
            after registration and can log in to complete your profile.
          </div>

          <form onSubmit={handleAddMember}>
            <div className="pub-group">
              <label className="pub-label">First Name *</label>
              <input
                type="text"
                className="pub-input"
                value={newMember.firstName}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    firstName: capitalizeWords(e.target.value),
                  })
                }
                required
                placeholder="Enter your first name"
              />
            </div>

            <div className="pub-group">
              <label className="pub-label">Last Name *</label>
              <input
                type="text"
                className="pub-input"
                value={newMember.lastName}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    lastName: capitalizeWords(e.target.value),
                  })
                }
                required
                placeholder="Enter your last name"
              />
            </div>

            <div className="pub-group">
              <label className="pub-label">Password *</label>
              <input
                type="password"
                className="pub-input"
                value={newMember.password}
                onChange={(e) =>
                  setNewMember({ ...newMember, password: e.target.value })
                }
                required
                minLength="6"
                placeholder="Min 6 characters"
              />
            </div>

            <div className="pub-email-note">
              📧 Your login email will be:{" "}
              <strong style={{ color: "var(--text)" }}>
                {newMember.email || "—"}
              </strong>
            </div>

            <button type="submit" className="pub-submit">
              Create Account
            </button>
          </form>

          <div className="pub-footer">
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>

          <div className="pub-note">
            © {new Date().getFullYear()} AR-RIYAADAH SAVINGS HUB. All rights
            reserved.
          </div>
        </div>

        {showCredentialsModal && createdCredentials && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--bg-overlay)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "16px",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "14px",
                padding: "28px",
                maxWidth: "460px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: "0 0 16px 0",
                }}
              >
                🎉 Account Created!
              </h3>

              {[
                { label: "📧 Email", value: createdCredentials.email },
                { label: "🔑 Password", value: createdCredentials.password },
                {
                  label: "💳 Account Number",
                  value: createdCredentials.accountNumber,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "2px",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "var(--text)",
                        fontWeight: "600",
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(row.value, row.label)}
                    style={{
                      background: "var(--accent-bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              ))}

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  onClick={copyAllCredentials}
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      "linear-gradient(to right, var(--purple), #6d28d9)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  📋 Copy All
                </button>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setCreatedCredentials(null);
                    navigate("/login");
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  ✅ Go to Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading && members.length === 0) {
    return (
      <div
        style={{
          padding: "24px",
          color: "var(--text)",
          backgroundColor: "var(--bg-app)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "var(--text)" }}>Loading...</div>
      </div>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .modal-content { background: var(--bg-surface); border-radius: 12px; padding: 28px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border); color: var(--text); }
        .modal-content-lg { max-width: 820px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-title { font-size: 18px; font-weight: bold; margin: 0; color: var(--text); }
        .modal-close { background: none; border: none; color: var(--text-muted); font-size: 26px; cursor: pointer; padding: 0 6px; }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
        .form-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface-2) !important; color: var(--text) !important; -webkit-text-fill-color: var(--text) !important; caret-color: var(--accent); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
        .form-input::placeholder { color: var(--text-dim) !important; -webkit-text-fill-color: var(--text-dim) !important; opacity: 1; }
        .form-input:focus { border-color: var(--accent); }
        .form-input:disabled { opacity: 0.6; }
        .form-input[type="number"]::-webkit-outer-spin-button, .form-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .form-input[type="number"] { -moz-appearance: textfield; }
        .form-select { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface-2) !important; color: var(--text) !important; -webkit-text-fill-color: var(--text) !important; font-size: 14px; outline: none; cursor: pointer; box-sizing: border-box; }
        .form-select:focus { border-color: var(--accent); }
        .form-select option { background: var(--bg-surface); color: var(--text); }
        .btn-primary { padding: 10px 24px; border-radius: 8px; border: none; background: var(--accent); color: white; cursor: pointer; font-size: 14px; font-weight: 500; }
        .btn-primary:hover { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 10px 24px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; font-size: 14px; }
        .btn-add { padding: 10px 20px; border-radius: 8px; border: none; background: var(--approved-bg); color: var(--badge-text); cursor: pointer; font-size: 14px; font-weight: 500; }
        .btn-excel { padding: 10px 20px; border-radius: 8px; border: none; background: #1d6f42; color: white; cursor: pointer; font-size: 14px; font-weight: 500; }
        .btn-role { padding: 10px 20px; border-radius: 8px; border: none; background: var(--accent-bg); color: var(--purple); cursor: pointer; font-size: 14px; }
        .btn-refresh { padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; transition: background 0.15s; }
        .btn-refresh:hover:not(:disabled) { background: var(--bg-surface-2); }
        .btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-refresh .spin { display: inline-block; animation: spin 1s linear infinite; }
        .error-banner { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #f87171; display: flex; align-items: center; gap: 10px; }
        .error-banner .retry { margin-left: auto; padding: 4px 12px; border-radius: 6px; border: 1px solid #f87171; background: transparent; color: #f87171; cursor: pointer; font-size: 12px; font-weight: 600; }
        .error-banner .retry:hover { background: rgba(239,68,68,0.12); }
        .role-badge, .status-badge { display: inline-block; padding: 4px 12px; font-size: 11px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35); }
        .credential-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px; background: var(--bg-surface-2); border: 1px solid var(--border); margin-bottom: 8px; }
        .credential-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .credential-value { font-size: 14px; color: var(--text); font-weight: 600; font-family: monospace; word-break: break-all; }
        .cred-copy-btn { background: var(--accent-bg); color: var(--text); border: 1px solid var(--border); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .am-table { width: 100%; border-collapse: collapse; border: none; background: transparent; }
        .am-table thead { background: transparent; }
        .am-table thead th { padding: 12px 16px; text-align: left; font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; border: none; }
        .am-table tbody tr { border: none; background: transparent; transition: background-color 0.15s ease; }
        .am-table tbody tr.selected { background: rgba(59,130,246,0.08) !important; }
        .am-table tbody tr:hover { background: var(--bg-surface-2); }
        .am-table tbody td { padding: 12px 16px; border: none; color: var(--text); }
        .am-search { width: 100%; background: transparent; color: var(--text) !important; -webkit-text-fill-color: var(--text) !important; padding: 10px 0; border: none; border-bottom: 1px solid var(--border); border-radius: 0; outline: none; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s ease; }
        .am-search::placeholder { color: var(--text-dim) !important; -webkit-text-fill-color: var(--text-dim) !important; opacity: 1; }
        .am-search:focus { border-bottom-color: var(--accent); }
        .bulk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bulk-table th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); font-weight: 600; }
        .bulk-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text); }
        .bulk-table tr.row-error td { background: var(--rejected-bg); }
        .action-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 6px; border-radius: 6px; transition: background 0.15s; }
        .action-btn:hover { background: var(--bg-surface-3); }
        .am-checkbox { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; margin: 0; }
        .bulk-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; margin-bottom: 16px; border-radius: 12px; background: linear-gradient(90deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08)); border: 1px solid rgba(59,130,246,0.35); flex-wrap: wrap; }
        .bulk-bar-text { font-size: 13px; font-weight: 600; color: var(--text); }
        .bulk-bar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .bulk-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .bulk-btn:hover:not(:disabled) { background: var(--bg-surface-2); }
        .bulk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .bulk-btn.danger { color: #f87171; border-color: rgba(239,68,68,0.4); }
        .bulk-btn.danger:hover:not(:disabled) { background: rgba(239,68,68,0.12); }
        .bulk-btn.success { color: #34d399; border-color: rgba(16,185,129,0.4); }
        .bulk-btn.success:hover:not(:disabled) { background: rgba(16,185,129,0.12); }
        .bulk-btn.warning { color: #fbbf24; border-color: rgba(234,179,8,0.4); }
        .bulk-btn.warning:hover:not(:disabled) { background: rgba(234,179,8,0.12); }
      `}</style>

      {/* ✅ FIXED: Branch banner uses resolvedBranchName / resolvedBranchCode */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "14px 18px",
          marginBottom: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          background: "rgba(16, 185, 129, 0.06)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "26px" }}>🏢</span>
          <div>
            <div
              style={{
                color: "var(--text)",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              {resolvedBranchName}
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              {resolvedBranchCode} · Members for this branch only ·{" "}
              <strong style={{ color: "var(--credit)" }}>
                {members.length}
              </strong>{" "}
              members ·{" "}
              <strong style={{ color: "var(--info)" }}>
                {transactions.length}
              </strong>{" "}
              transactions
            </div>
          </div>
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            background: "rgba(16, 185, 129, 0.2)",
            color: "var(--credit)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
          }}
        >
          ● active branch
        </span>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            👥 Members Management
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "4px 0 0 0",
              fontSize: "14px",
            }}
          >
            Manage members for {resolvedBranchName}, assign roles, view balances
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Reload members and transactions"
          >
            <span className={refreshing ? "spin" : ""}>🔄</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={() => setShowRoleModal(true)} className="btn-role">
            🔑 Assign Role
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={handleExcelUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-excel"
          >
            📤 Bulk Upload (Excel)
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-add">
            + Add New Member
          </button>
        </div>
      </div>

      {lastError && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{lastError}</span>
          <button className="retry" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          className="am-search"
          placeholder="🔍 Search by name, email, phone, or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {selectedCount > 0 && (
        <div className="bulk-bar">
          <div className="bulk-bar-text">
            ✅ {selectedCount} member{selectedCount !== 1 ? "s" : ""} selected
          </div>
          <div className="bulk-bar-actions">
            <button
              className="bulk-btn success"
              onClick={() => handleBulkStatus("active")}
              disabled={bulkActionRunning}
            >
              ✅ Activate
            </button>
            <button
              className="bulk-btn warning"
              onClick={() => handleBulkStatus("suspended")}
              disabled={bulkActionRunning}
            >
              ⏸ Suspend
            </button>
            <button
              className="bulk-btn danger"
              onClick={handleBulkDelete}
              disabled={bulkActionRunning}
            >
              {bulkActionRunning
                ? "⏳ Working..."
                : `🗑️ Delete ${selectedCount}`}
            </button>
            <button
              className="bulk-btn"
              onClick={clearSelection}
              disabled={bulkActionRunning}
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      <div>
        <div style={{ overflowX: "auto" }}>
          <table className="am-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    className="am-checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={toggleSelectAll}
                    title="Select all"
                  />
                </th>
                {[
                  "Membership",
                  "Member",
                  "Contact",
                  "Role",
                  "Status",
                  "Profile",
                  "Balance",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const roleStyle = getRoleColor(member.role);
                const statusStyle = getStatusColor(member.status);
                const isSelected = selectedIds.has(member.id);

                return (
                  <tr key={member.id} className={isSelected ? "selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        className="am-checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(member.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--info)",
                          fontFamily: "monospace",
                        }}
                      >
                        {member.membership_number}
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "var(--approved-bg)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--badge-text)",
                            fontWeight: "bold",
                            overflow: "hidden",
                          }}
                        >
                          {member.passport_photo ? (
                            <img
                              src={`${API_BASE_URL}/api/uploads/passports/${member.passport_photo}`}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            (member.full_name || "U").charAt(0)
                          )}
                        </div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                        >
                          {member.full_name}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "13px", color: "var(--text)" }}>
                        {member.email}
                      </div>
                      <div
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        {member.phone || "—"}
                      </div>
                    </td>
                    <td>
                      <span
                        className="role-badge"
                        style={{
                          background: roleStyle.bg,
                          color: roleStyle.color,
                          border: roleStyle.border,
                        }}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: statusStyle.border,
                        }}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      {member.profile_completed ? (
                        <span
                          style={{
                            color: "var(--credit)",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          ✅ Complete
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "var(--warning)",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--credit)",
                      }}
                    >
                      ₦{parseFloat(member.balance || 0).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleEditMember(member)}
                          className="action-btn"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="action-btn"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && !lastError && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📭</div>
            <p>No members found in {resolvedBranchName}</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add New Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setNewMember({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                  });
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                backgroundColor: "var(--accent-bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text)" }}>
                💡 New member will be created in{" "}
                <strong>{resolvedBranchName}</strong>. They'll complete their
                profile after logging in.
              </p>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMember.firstName}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      firstName: capitalizeWords(e.target.value),
                    })
                  }
                  required
                  placeholder="First name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMember.lastName}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      lastName: capitalizeWords(e.target.value),
                    })
                  }
                  required
                  placeholder="Last name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  required
                  minLength="6"
                  placeholder="Min 6 characters"
                />
              </div>

              <div
                style={{
                  backgroundColor: "var(--approved-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "12px",
                }}
              >
                <p
                  style={{ margin: 0, fontSize: "12px", color: "var(--text)" }}
                >
                  📧 Auto email:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {newMember.email || "—"}
                  </strong>
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Create Member
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewMember({
                      firstName: "",
                      lastName: "",
                      email: "",
                      password: "",
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Preview Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-lg">
            <div className="modal-header">
              <h3 className="modal-title">📤 Bulk Upload Preview</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkRows([]);
                  setBulkResults(null);
                }}
              >
                ×
              </button>
            </div>

            {!bulkResults ? (
              <>
                <div
                  style={{
                    backgroundColor: "var(--accent-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  Found <strong>{bulkRows.length}</strong> row(s).{" "}
                  <strong style={{ color: "var(--credit)" }}>
                    {bulkRows.filter((r) => !r.errors.length).length} valid
                  </strong>
                  {bulkRows.filter((r) => r.errors.length).length > 0 && (
                    <>
                      ,{" "}
                      <strong style={{ color: "var(--rejected)" }}>
                        {bulkRows.filter((r) => r.errors.length).length} with
                        errors
                      </strong>
                    </>
                  )}
                </div>

                <div
                  style={{
                    maxHeight: "360px",
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <table className="bulk-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Password</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((r, i) => (
                        <tr
                          key={i}
                          className={r.errors.length ? "row-error" : ""}
                        >
                          <td>{r._row}</td>
                          <td>{r.firstName || "—"}</td>
                          <td>{r.lastName || "—"}</td>
                          <td>{r.password || "—"}</td>
                          <td>
                            {r.errors.length ? (
                              <span style={{ color: "var(--rejected)" }}>
                                ⚠️ {r.errors.join(", ")}
                              </span>
                            ) : (
                              <span style={{ color: "var(--credit)" }}>
                                ✅ Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "18px" }}
                >
                  <button
                    className="btn-primary"
                    style={{ flex: 1, background: "#1d6f42" }}
                    disabled={
                      bulkUploading ||
                      bulkRows.filter((r) => !r.errors.length).length === 0
                    }
                    onClick={handleBulkUpload}
                  >
                    {bulkUploading
                      ? "Uploading..."
                      : `Upload ${
                          bulkRows.filter((r) => !r.errors.length).length
                        } Member(s)`}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkRows([]);
                      setBulkResults(null);
                    }}
                    disabled={bulkUploading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    backgroundColor: "var(--approved-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  ✅{" "}
                  <strong>
                    {bulkResults.filter((r) => r.status === "success").length}
                  </strong>{" "}
                  succeeded,{" "}
                  <strong style={{ color: "var(--rejected)" }}>
                    {bulkResults.filter((r) => r.status === "failed").length}
                  </strong>{" "}
                  failed.
                </div>

                <div
                  style={{
                    maxHeight: "360px",
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <table className="bulk-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Password</th>
                        <th>Account No.</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((r, i) => (
                        <tr
                          key={i}
                          className={r.status === "failed" ? "row-error" : ""}
                        >
                          <td>{r.row}</td>
                          <td>{r.name}</td>
                          <td>{r.email || "—"}</td>
                          <td>{r.password || "—"}</td>
                          <td>{r.accountNumber || "—"}</td>
                          <td>
                            {r.status === "success" ? (
                              <span style={{ color: "var(--credit)" }}>
                                ✅ Success
                              </span>
                            ) : (
                              <span style={{ color: "var(--rejected)" }}>
                                ❌ {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "18px" }}
                >
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={downloadBulkResults}
                  >
                    📥 Download Results
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkRows([]);
                      setBulkResults(null);
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🎉 Member Created!</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials(null);
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                backgroundColor: "var(--approved-bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--text)",
                  lineHeight: 1.5,
                }}
              >
                ⚠️ <strong>Share these credentials</strong> with{" "}
                <strong>{createdCredentials.name}</strong>.
              </p>
            </div>

            <div className="credential-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="credential-label">📧 Email</div>
                <div className="credential-value">
                  {createdCredentials.email}
                </div>
              </div>
              <button
                className="cred-copy-btn"
                onClick={() =>
                  copyToClipboard(createdCredentials.email, "Email")
                }
              >
                Copy
              </button>
            </div>

            <div className="credential-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="credential-label">🔑 Password</div>
                <div className="credential-value">
                  {createdCredentials.password}
                </div>
              </div>
              <button
                className="cred-copy-btn"
                onClick={() =>
                  copyToClipboard(createdCredentials.password, "Password")
                }
              >
                Copy
              </button>
            </div>

            <div className="credential-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="credential-label">💳 Account Number</div>
                <div className="credential-value">
                  {createdCredentials.accountNumber}
                </div>
              </div>
              <button
                className="cred-copy-btn"
                onClick={() =>
                  copyToClipboard(
                    createdCredentials.accountNumber,
                    "Account number",
                  )
                }
              >
                Copy
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={copyAllCredentials}
              >
                📋 Copy All
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                  setEditPassword("");
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateMember}>
              <div className="form-group">
                <label className="form-label">Membership Number</label>
                <input
                  className="form-input"
                  value={selectedMember.membership_number || "N/A"}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={selectedMember.full_name || ""}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={selectedMember.email || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={selectedMember.phone || ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setSelectedMember({ ...selectedMember, phone: v });
                  }}
                  maxLength="11"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={selectedMember.role}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="member">👤 Member</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">New Password (optional)</label>
                <input
                  type="password"
                  className="form-input"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength="6"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Balance (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  value={selectedMember.balance || 0}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={selectedMember.status}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                    setEditPassword("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🔑 Assign Role</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRoleModal(false);
                  setRoleAssignment({ memberId: "", role: "member" });
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssignRole();
              }}
            >
              <div className="form-group">
                <label className="form-label">Select Member *</label>
                <select
                  className="form-select"
                  required
                  value={roleAssignment.memberId}
                  onChange={(e) =>
                    setRoleAssignment({
                      ...roleAssignment,
                      memberId: e.target.value,
                    })
                  }
                >
                  <option value="">Choose a member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.membership_number}) — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role *</label>
                <select
                  className="form-select"
                  required
                  value={roleAssignment.role}
                  onChange={(e) =>
                    setRoleAssignment({
                      ...roleAssignment,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="member">👤 Member</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Assign Role
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowRoleModal(false);
                    setRoleAssignment({ memberId: "", role: "member" });
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembers;
