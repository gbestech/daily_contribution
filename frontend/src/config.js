// src/config.js
const raw =
    import.meta.env?.VITE_API_BASE_URL ||          // Vite
    process.env?.REACT_APP_API_BASE_URL ||         // CRA fallback
    "";

// Strip trailing slash so we can safely concatenate paths
export const API_BASE_URL = raw.replace(/\/+$/, "");

// Guard: if someone deploys without an env file, fail loudly instead of
// silently calling localhost from a user's browser
if (!API_BASE_URL && typeof window !== "undefined") {
    console.warn(
        "[config] API_BASE_URL is empty — no VITE_API_BASE_URL set. " +
        "Requests will fail in production."
    );
}

export const IS_PROD = import.meta.env?.PROD ?? false;