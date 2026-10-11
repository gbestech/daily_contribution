// src/utils/api.js
const API_BASE_URL = "http://localhost:8000";

/**
 * Read the currently active branch id from localStorage.
 * Returns 0 if nothing saved yet.
 */
export const getActiveBranchId = () => {
    const saved = localStorage.getItem("active_branch_id");
    return saved ? parseInt(saved, 10) : 0;
};

/**
 * Build a URL with the branch_id query param appended.
 *   apiUrl("/api/members.php") -> "http://.../api/members.php?branch_id=1"
 */
export const apiUrl = (path) => {
    const base = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    const branchId = getActiveBranchId();
    const sep = base.includes("?") ? "&" : "?";
    return branchId > 0 ? `${base}${sep}branch_id=${branchId}` : base;
};

/**
 * fetch() wrapper that automatically adds ?branch_id=
 */
export const apiFetch = (path, options = {}) => {
    return fetch(apiUrl(path), options);
};