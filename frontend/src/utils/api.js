// src/utils/api.js
// ============================================================
// ⚠️ Set this to the URL that ACTUALLY serves your PHP backend.
// Verify in browser first (must return JSON, not 404):
//   http://localhost:8000/api/login.php
// ============================================================
const API_BASE_URL = "http://localhost:8000";

const BRANCH_REQUIRED_PATHS = [
    "/api/members.php",
    "/api/transactions.php",
    "/api/settings.php",
];

const PUBLIC_PATHS = [
    "/api/login.php",
    "/api/register-member.php",
    "/api/register.php",
    "/api/forgot-password.php",
    "/api/reset-password.php",
    "/api/get-branch.php",
    "/api/branches.php",
    "/api/daily-marks.php",
];

const isPublicPath = (path) => PUBLIC_PATHS.some((p) => path.startsWith(p));
const requiresBranch = (path) =>
    BRANCH_REQUIRED_PATHS.some((p) => path.startsWith(p));

const resolveBranchId = () => {
    try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        if (stored?.branch_id !== undefined && stored?.branch_id !== null) {
            const n = Number(stored.branch_id);
            if (Number.isFinite(n) && n > 0) return n;
        }
        if (stored?.branchId !== undefined && stored?.branchId !== null) {
            const n = Number(stored.branchId);
            if (Number.isFinite(n) && n > 0) return n;
        }
    } catch { }
    try {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get("branch");
        if (raw) {
            const n = Number(raw);
            if (Number.isFinite(n) && n > 0) return n;
        }
    } catch { }
    return null;
};

const resolveRole = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
    } catch {
        return "";
    }
};

const resolveUserId = () => {
    try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u?.id ?? u?.userId ?? "";
    } catch {
        return "";
    }
};

/**
 * apiFetch — returns a parsed JSON object (NOT a Response).
 * Throws Error with the server's message on non-2xx.
 */
export const apiFetch = async (path, options = {}) => {
    let url = path.startsWith("http")
        ? path
        : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    const method = String(options.method || "GET").toUpperCase();
    const isWrite = method !== "GET" && method !== "HEAD";

    const branchId = resolveBranchId();
    const role = resolveRole();
    const userId = resolveUserId();
    const isPublic = isPublicPath(path);
    const needsBranch = requiresBranch(path);
    const isAllQuery = /[?&]all=1(&|$)/.test(path);

    if (
        !isPublic &&
        needsBranch &&
        !isAllQuery &&
        !path.includes("branch_id=") &&
        branchId !== null
    ) {
        const sep = url.includes("?") ? "&" : "?";
        url = `${url}${sep}branch_id=${encodeURIComponent(branchId)}`;
    }

    const headers = {
        Accept: "application/json",
        ...(options.headers || {}),
    };

    const hasBody =
        options.body !== undefined &&
        options.body !== null &&
        !(typeof options.body === "string" && options.body.length === 0);
    const isFormData =
        typeof FormData !== "undefined" && options.body instanceof FormData;

    if (hasBody && !isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (!isPublic && isWrite) {
        if (branchId !== null) headers["X-User-Branch-Id"] = String(branchId);
        if (role) headers["X-User-Role"] = String(role);
        if (userId !== "" && userId !== null && userId !== undefined) {
            headers["X-User-Id"] = String(userId);
        }
    }

    // Debug log — remove after diagnosis
    console.log("🌐 apiFetch →", method, url);

    let res;
    try {
        res = await fetch(url, { ...options, headers });
    } catch (err) {
        console.error("❌ Network error:", method, url, err);
        throw new Error(
            `Cannot reach server at ${url}. Check that PHP is running on ${API_BASE_URL} and the path is correct.`,
        );
    }

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(
            `Server returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
        );
    }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }

    return data;
};

export { resolveBranchId, API_BASE_URL };
export default apiFetch;