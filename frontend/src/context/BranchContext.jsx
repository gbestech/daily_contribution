// src/context/BranchContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "https://baleeg.onrender.com";

const BranchContext = createContext(null);

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    return {
      activeBranch: null,
      activeBranchId: null,
      branches: [],
      loading: false,
      error: null,
      switchBranch: () => {},
      refreshBranches: async () => [],
    };
  }
  return ctx;
};

const LS_ACTIVE_BRANCH = "active_branch";
const LS_ACTIVE_BRANCH_ID = "active_branch_id";
const LS_SELECTED_BRANCH_ID = "selectedBranchId";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const isStaffUser = () => {
  const u = readUser();
  const role = String(u?.role || "").toLowerCase();
  return (
    role === "admin" ||
    role === "administrator" ||
    role === "manager" ||
    role === "branch_manager"
  );
};

const persistBranch = (branch) => {
  try {
    if (!branch) {
      localStorage.removeItem(LS_ACTIVE_BRANCH);
      localStorage.removeItem(LS_ACTIVE_BRANCH_ID);
      localStorage.removeItem(LS_SELECTED_BRANCH_ID);
      return;
    }
    localStorage.setItem(LS_ACTIVE_BRANCH, JSON.stringify(branch));
    localStorage.setItem(LS_ACTIVE_BRANCH_ID, String(branch.id));
    localStorage.setItem(LS_SELECTED_BRANCH_ID, String(branch.id));
  } catch {
    /* storage may be blocked */
  }
};

const pickDefault = (list) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    list.find((b) => String(b.status).toLowerCase() === "active") ||
    list[0] ||
    null
  );
};

export const BranchProvider = ({ children }) => {
  const [activeBranch, setActiveBranch] = useState(null);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/branches.php`, {
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("branches.php returned non-JSON");
      }
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const list = Array.isArray(data.branches) ? data.branches : [];
      setBranches(list);
      return list;
    } catch (e) {
      console.error("[BranchContext] refreshBranches failed:", e);
      setError(e.message || "Failed to load branches");
      setBranches([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const switchBranch = useCallback((branch) => {
    if (!isStaffUser()) return;
    if (!branch) {
      setActiveBranch(null);
      setActiveBranchId(null);
      persistBranch(null);
      return;
    }
    setActiveBranch(branch);
    setActiveBranchId(branch.id ?? null);
    persistBranch(branch);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!isStaffUser()) {
        setActiveBranch(null);
        setActiveBranchId(null);
        persistBranch(null);
        return;
      }

      let cached = null;
      try {
        cached = JSON.parse(localStorage.getItem(LS_ACTIVE_BRANCH) || "null");
      } catch {
        cached = null;
      }
      if (
        (!cached || !cached.id) &&
        localStorage.getItem(LS_ACTIVE_BRANCH_ID)
      ) {
        cached = { id: localStorage.getItem(LS_ACTIVE_BRANCH_ID) };
      }

      const list = await refreshBranches();
      if (cancelled) return;

      const findById = (id) =>
        id == null
          ? null
          : list.find((b) => String(b.id) === String(id)) || null;

      if (cached?.id) {
        const real = findById(cached.id);
        if (real) {
          setActiveBranch(real);
          setActiveBranchId(real.id);
          persistBranch(real);
          return;
        }
        console.warn(
          "[BranchContext] cached branch id",
          cached.id,
          "no longer exists — clearing",
        );
        persistBranch(null);
      }

      const u = readUser();
      if (u?.branch_id) {
        const own = findById(u.branch_id);
        if (own) {
          setActiveBranch(own);
          setActiveBranchId(own.id);
          persistBranch(own);
          return;
        }
      }

      const first = pickDefault(list);
      if (first) {
        setActiveBranch(first);
        setActiveBranchId(first.id);
        persistBranch(first);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshBranches]);

  useEffect(() => {
    if (!isStaffUser()) return;
    if (branches.length === 0) return;
    if (!activeBranchId) return;

    const stillExists = branches.some(
      (b) => String(b.id) === String(activeBranchId),
    );
    if (stillExists) return;

    const replacement = pickDefault(branches);
    if (replacement) {
      setActiveBranch(replacement);
      setActiveBranchId(replacement.id);
      persistBranch(replacement);
    } else {
      setActiveBranch(null);
      setActiveBranchId(null);
      persistBranch(null);
    }
  }, [branches, activeBranchId]);

  const value = {
    activeBranch,
    activeBranchId,
    branches,
    loading,
    error,
    switchBranch,
    refreshBranches,
  };

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
};

export default BranchContext;
