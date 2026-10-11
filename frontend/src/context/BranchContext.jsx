// src/context/BranchContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const API_BASE_URL = "http://localhost:8000";

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
      refreshBranches: () => {},
    };
  }
  return ctx;
};

export const BranchProvider = ({ children }) => {
  const [activeBranch, setActiveBranch] = useState(null);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper — is the logged-in user staff?
  const isStaffUser = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const role = String(u?.role || "").toLowerCase();
      return role === "admin" || role === "administrator" || role === "manager";
    } catch {
      return false;
    }
  };

  // ------------------------------------------------------------
  // Load the list of branches from the DB
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Switch active branch (staff only)
  // ------------------------------------------------------------
  const switchBranch = useCallback((branch) => {
    if (!isStaffUser()) {
      // Non-staff can never set an active branch
      return;
    }
    if (!branch) {
      setActiveBranch(null);
      setActiveBranchId(null);
      localStorage.removeItem("active_branch");
      localStorage.removeItem("active_branch_id");
      return;
    }
    setActiveBranch(branch);
    setActiveBranchId(branch.id ?? null);
    localStorage.setItem("active_branch", JSON.stringify(branch));
    localStorage.setItem("active_branch_id", String(branch.id ?? ""));
  }, []);

  // ------------------------------------------------------------
  // On mount — validate the cached branch against the DB.
  // If the cached branch no longer exists, wipe it.
  // Non-staff users should never have a cached branch at all.
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      // Wipe any branch cache for non-staff users immediately
      if (!isStaffUser()) {
        setActiveBranch(null);
        setActiveBranchId(null);
        localStorage.removeItem("active_branch");
        localStorage.removeItem("active_branch_id");
        return;
      }

      let cached = null;
      try {
        cached = JSON.parse(localStorage.getItem("active_branch") || "null");
      } catch {
        cached = null;
      }

      if (!cached || !cached.id) return;

      // Validate: does the cached branch still exist in the DB?
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/get-branch.php?id=${encodeURIComponent(cached.id)}`,
          { headers: { Accept: "application/json" } },
        );
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        const branch = data.branch || data.data?.branch || data.data || null;
        const isReal =
          data.status === true &&
          branch &&
          branch.id !== undefined &&
          (branch.name || branch.code);

        if (cancelled) return;

        if (isReal) {
          // Keep it — but refresh with the latest DB values
          setActiveBranch(branch);
          setActiveBranchId(branch.id);
          localStorage.setItem("active_branch", JSON.stringify(branch));
          localStorage.setItem("active_branch_id", String(branch.id));
        } else {
          // Cached branch no longer exists → clear it
          console.warn(
            "[BranchContext] cached branch id",
            cached.id,
            "no longer exists in DB — clearing",
          );
          setActiveBranch(null);
          setActiveBranchId(null);
          localStorage.removeItem("active_branch");
          localStorage.removeItem("active_branch_id");
        }
      } catch (e) {
        console.error("[BranchContext] cached branch validation failed:", e);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------
  // Whenever the list of branches is loaded (e.g. after admin edits),
  // make sure the active branch still exists. If not, clear it.
  // ------------------------------------------------------------
  useEffect(() => {
    if (!activeBranchId) return;
    if (branches.length === 0) return;
    const stillExists = branches.some(
      (b) => String(b.id) === String(activeBranchId),
    );
    if (!stillExists && isStaffUser()) {
      console.warn(
        "[BranchContext] active branch id",
        activeBranchId,
        "was removed — clearing",
      );
      setActiveBranch(null);
      setActiveBranchId(null);
      localStorage.removeItem("active_branch");
      localStorage.removeItem("active_branch_id");
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
