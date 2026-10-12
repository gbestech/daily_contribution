// src/hooks/useBranchBranding.js
//
// Resolves WHICH branch a pre-login page (sign-in, register) belongs to, and
// the name to show for it — using the SAME lookup the registration form uses
// (api/get-branch.php), so the two pages can never disagree.
//
// Branch comes from, in order:
//   1) ?branch=<id or code>  (or ?branch_id=) in the URL
//   2) the branch remembered on this device (only when allowSaved = true)
//
// If no branch can be determined, name is null — the page should then show a
// neutral title. (Previously the sign-in page called settings.php with no
// branch_id, and the backend answered with the FIRST active branch, which is
// why everybody saw the wrong name.)
import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000";
const STORAGE_KEY = "last_branch_id";

export const rememberBranch = (branchId) => {
  try {
    if (branchId) localStorage.setItem(STORAGE_KEY, String(branchId));
  } catch {
    /* storage unavailable — ignore */
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
    name: null, // saved shop name for the branch, else the branch name
    notFound: false, // link points to a branch that doesn't exist
    failed: false, // network / server problem
  });

  useEffect(() => {
    if (!raw) return;
    let cancelled = false;

    (async () => {
      try {
        // 1) the branch itself (same endpoint the registration form used)
        const isNumeric = /^\d+$/.test(raw);
        const url = isNumeric
          ? `${API_BASE_URL}/api/get-branch.php?id=${raw}`
          : `${API_BASE_URL}/api/get-branch.php?code=${encodeURIComponent(raw)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!(data.status && data.branch)) {
          if (!cancelled) {
            setState({
              loading: false,
              branch: null,
              name: null,
              notFound: true,
              failed: false,
            });
          }
          return;
        }

        const branch = data.branch;

        // 2) the shop name the admin saved for THIS branch (optional)
        let shopName = null;
        try {
          const sRes = await fetch(
            `${API_BASE_URL}/api/settings.php?branch_id=${encodeURIComponent(branch.id)}`,
          );
          const sData = await sRes.json();
          shopName = (sData?.status && sData?.data?.general?.shop_name) || null;
        } catch {
          /* fall back to the branch name */
        }

        if (cancelled) return;
        rememberBranch(branch.id);
        setState({
          loading: false,
          branch,
          name: shopName || branch.name || null,
          notFound: false,
          failed: false,
        });
      } catch (err) {
        console.error("[useBranchBranding] failed:", err);
        if (!cancelled) {
          setState({
            loading: false,
            branch: null,
            name: null,
            notFound: false,
            failed: true,
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
