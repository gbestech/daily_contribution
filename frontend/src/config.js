// src/config.js
//
// Single source of truth for the backend base URL.
// - Local dev (Vite on :5173, XAMPP on :80):  falls back to http://localhost/baleeg
// - Production (Render): VITE_API_BASE_URL=http://localhost/baleeg
//
// Never hardcode a URL in a component again â€” always import { API_BASE_URL }.

// Safely read the Vite env var. In the browser bundle, import.meta.env is
// always defined under Vite; in non-Vite tooling it may be undefined.
const raw =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE_URL) ||
    "";

// Sensible localhost fallback so dev never silently breaks.
const FALLBACK = "http://localhost/baleeg";

// Strip trailing slashes so `${API_BASE_URL}/api/x.php` is always clean.
export const API_BASE_URL = (raw || FALLBACK).replace(/\/+$/, "");

// Loud warning if we had to fall back in production â€” the app would then be
// calling localhost from a user's browser, which will fail.
if (typeof window !== "undefined") {
    const isProd = Boolean(
        typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PROD
    );
    if (isProd && !raw) {
        // eslint-disable-next-line no-console
        console.error(
            "[config] VITE_API_BASE_URL is not set in this production build. " +
            "Requests will target " +
            API_BASE_URL +
            " and will likely fail. Set it in the Render frontend environment."
        );
    }
}

export const IS_PROD = Boolean(
    typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PROD
);

export default API_BASE_URL;