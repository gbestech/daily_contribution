// src/hooks/useBranchBranding.js
import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const STORAGE_KEY = "last_branch_id";

export const rememberBranch = (branchId) => {
  try {
    if (branchId) localStorage.setItem(STORAGE_KEY, String(branchId));
  } catch {
    /* ignore */
  }
};

const readBranchParam = (allowSaved) => {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("branch") || params.get("branch_id");
    if (fromUrl) return fromUrl;
    if (allowSaved) return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    /* ignore */
  }
  return "";
};

const useBranchBranding = ({ allowSaved = true } = {}) => {
  const [raw] = useState(() => readBranchParam(allowSaved));

  const [state, setState] = useState({
    loading: !!raw,
    branch: null,
    name: null,
    notFound: false,
    failed: false,
    isActive: true,
  });

  useEffect(() => {
    if (!raw) {
      setState({
        loading: false,
        branch: null,
        name: null,
        notFound: false,
        failed: false,
        isActive: true,
      });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const isNumeric = /^\d+$/.test(raw);
        const query = isNumeric
          ? `?id=${encodeURIComponent(raw)}`
          : `?code=${encodeURIComponent(raw)}`;

        const data = await apiFetch(`/api/get-branch.php${query}`);

        if (!(data.status && data.branch)) {
          if (!cancelled) {
            setState({
              loading: false,
              branch: null,
              name: null,
              notFound: true,
              failed: false,
              isActive: true,
            });
          }
          return;
        }

        const branch = data.branch;
        const isActive =
          typeof data.is_active === "boolean"
            ? data.is_active
            : String(branch.status || "active").toLowerCase() === "active";

        let shopName = null;
        try {
          const sData = await apiFetch(
            `/api/settings.php?branch_id=${encodeURIComponent(branch.id)}`,
          );
          shopName =
            (sData?.status && sData?.data?.general?.shop_name) || null;
        } catch {
          /* settings not critical */
        }

        if (cancelled) return;
        rememberBranch(branch.id);
        setState({
          loading: false,
          branch,
          name: shopName || branch.name || null,
          notFound: false,
          failed: false,
          isActive,
        });
      } catch (err) {
        if (cancelled) return;
        const msg = String(err?.message || "");
        const is404 = /404|not found/i.test(msg);
        if (is404) {
          setState({
            loading: false,
            branch: null,
            name: null,
            notFound: true,
            failed: false,
            isActive: true,
          });
        } else {
          console.error("[useBranchBranding] failed:", err);
          setState({
            loading: false,
            branch: null,
            name: null,
            notFound: false,
            failed: true,
            isActive: true,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [raw]);

  return {
    hasParam: !!raw,
    branchId: state.branch?.id ?? null,
    code: state.branch?.code ?? null,
    ...state,
  };
};

export default useBranchBranding;