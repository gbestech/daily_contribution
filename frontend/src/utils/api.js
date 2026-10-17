// src/utils/api.js
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

const isPublicPath = (path) =>
    PUBLIC_PATHS.some((p) => path.startsWith(p));

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

    if (!isPublic && needsBranch && !isAllQuery && !path.includes("branch_id=")) {
        if (branchId === null) {
            console.warn(
                `[apiFetch] Skipped "${path}" — no branch_id available yet.`,
            );
            return new Response(
                JSON.stringify({
                    error: "branch_id is required",
                    synthetic: true,
                    path,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } },
            );
        }
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

    return fetch(url, { ...options, headers });
};

export { resolveBranchId };
export default apiFetch;