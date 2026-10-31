// src/utils/api.js
// ============================================================
//  API client — single source of truth for backend calls.
//  Backend base URL comes from Vite env (falls back to prod URL).
// ============================================================

const envBase =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";

const API_BASE_URL = (envBase || "https://baleeg.onrender.com").replace(/\/+$/, "");

// Only truly unauthenticated endpoints belong here.
const PUBLIC_PATHS = [
    "/api/login.php",
    "/api/register-member.php",
    "/api/register.php",
    "/api/forgot-password.php",
    "/api/reset-password.php",
    "/api/daily-marks.php",
];

// Endpoints where we auto-attach ?branch_id= when missing.
// (Only for collection routes, not single-resource routes like /members.php/123)
const BRANCH_REQUIRED_PATHS = [
    "/api/members.php",
    "/api/transactions.php",
    "/api/settings.php",
];

// Path-boundary match — prevents "/api/branches.phpX" matching "/api/branches.php".
const matchesPath = (path, list) =>
    list.some(
        (p) => path === p || path.startsWith(p + "?") || path.startsWith(p + "/"),
    );

// Detect single-resource routes like /api/members.php/123 — do not append query.
const isSingleResource = (path) => /^\/api\/[^/?#]+\.php\/\d+/.test(path);

const resolveBranchId = () => {
    try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        for (const v of [stored?.branch_id, stored?.branchId]) {
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return n;
        }
    } catch { }
    try {
        const raw = new URLSearchParams(window.location.search).get("branch");
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
    const isPublic = matchesPath(path, PUBLIC_PATHS);
    const needsBranch = matchesPath(path, BRANCH_REQUIRED_PATHS);
    const isAllQuery = /[?&]all=1(&|$)/.test(path);

    // Only append branch_id for collection routes, not /members.php/123
    if (
        !isPublic &&
        needsBranch &&
        !isAllQuery &&
        !isSingleResource(path) &&
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

    let res;
    try {
        res = await fetch(url, { ...options, headers });
    } catch (err) {
        // True network failure: DNS, offline, CORS preflight fail, etc.
        throw new Error(
            `Cannot reach ${API_BASE_URL} (${method} ${path}). ` +
            `Check that the backend is running. [${err.message}]`,
        );
    }

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const looksJson = contentType.includes("json");

    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            // Not JSON — likely an HTML error page from PHP
            const snippet = text.replace(/\s+/g, " ").slice(0, 160);
            const isHtml = /<(!doctype|html|br|b>)/i.test(text);
            const isPdoError = /PDOException|getaddrinfo|SQLSTATE/.test(text);

            if (isPdoError) {
                throw new Error(
                    `Backend reached the server but the database is unreachable. ` +
                    `(HTTP ${res.status}) ${snippet}`,
                );
            }
            if (isHtml) {
                throw new Error(
                    `Server returned HTML instead of JSON (HTTP ${res.status}). ` +
                    `Likely an API error page: ${snippet}`,
                );
            }
            throw new Error(
                `Server returned non-JSON (HTTP ${res.status}): ${snippet}`,
            );
        }
    }

    if (!res.ok) {
        throw new Error(
            data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`,
        );
    }

    return data ?? {};
};

export { resolveBranchId, API_BASE_URL };
export default apiFetch;