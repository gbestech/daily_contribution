// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const THEMES = {
  light: {
    name: "Light",
    icon: "☀️",
    vars: {
      // Page background: soft grey so white surfaces stand out
      "--bg-app": "#eef2f7",
      // Cards / panels: pure white
      "--bg-surface": "#ffffff",
      // Hover rows, subtle fills: clearly visible grey
      "--bg-surface-2": "#f1f5f9",
      // Active nav, chips: stronger grey
      "--bg-surface-3": "#e2e8f0",
      // Overlay behind modals
      "--bg-overlay": "rgba(15,23,42,0.45)",

      // Borders: visible but not heavy
      "--border": "#cbd5e1",
      "--border-strong": "#94a3b8",

      // Text hierarchy: dark, high contrast
      "--text": "#0f172a",
      "--text-muted": "#475569",
      "--text-dim": "#64748b",

      // Accent (emerald, slightly deeper for contrast on white)
      "--accent": "#047857",
      "--accent-hover": "#065f46",
      "--accent-text": "#065f46",

      // Semantic colors
      "--credit": "#047857",
      "--debit": "#b91c1c",
      "--warning": "#b45309",
      "--info": "#1d4ed8",
      "--purple": "#6d28d9",

      // Status badges (more opaque so they read clearly)
      "--pending-bg": "rgba(217,119,6,0.15)",
      "--pending-border": "#b45309",
      "--approved-bg": "rgba(5,150,105,0.15)",
      "--approved-border": "#047857",
      "--rejected-bg": "rgba(185,28,28,0.15)",
      "--rejected-border": "#b91c1c",
    },
  },
  dark: {
    name: "Dark",
    icon: "🌙",
    vars: {
      "--bg-app": "#0f172a",
      "--bg-surface": "#1e293b",
      "--bg-surface-2": "rgba(255,255,255,0.05)",
      "--bg-surface-3": "rgba(255,255,255,0.08)",
      "--bg-overlay": "rgba(0,0,0,0.7)",
      "--border": "rgba(255,255,255,0.1)",
      "--border-strong": "rgba(255,255,255,0.2)",
      "--text": "#ffffff",
      "--text-muted": "#94a3b8",
      "--text-dim": "#64748b",
      "--accent": "#10b981",
      "--accent-hover": "#059669",
      "--accent-text": "#34d399",
      "--credit": "#34d399",
      "--debit": "#f87171",
      "--warning": "#fbbf24",
      "--info": "#60a5fa",
      "--purple": "#a78bfa",
      "--pending-bg": "rgba(245,158,11,0.08)",
      "--pending-border": "#f59e0b",
      "--approved-bg": "rgba(16,185,129,0.06)",
      "--approved-border": "#10b981",
      "--rejected-bg": "rgba(239,68,68,0.06)",
      "--rejected-border": "#ef4444",
    },
  },
  midnight: {
    name: "Moonlight",
    icon: "🌌",
    vars: {
      "--bg-app": "#0a0e27",
      "--bg-surface": "#141b3d",
      "--bg-surface-2": "rgba(120,140,255,0.06)",
      "--bg-surface-3": "rgba(120,140,255,0.1)",
      "--bg-overlay": "rgba(0,0,0,0.75)",
      "--border": "rgba(120,140,255,0.15)",
      "--border-strong": "rgba(120,140,255,0.3)",
      "--text": "#e8ecff",
      "--text-muted": "#8892c4",
      "--text-dim": "#5a6494",
      "--accent": "#6366f1",
      "--accent-hover": "#4f46e5",
      "--accent-text": "#818cf8",
      "--credit": "#34d399",
      "--debit": "#fb7185",
      "--warning": "#fbbf24",
      "--info": "#60a5fa",
      "--purple": "#c084fc",
      "--pending-bg": "rgba(245,158,11,0.1)",
      "--pending-border": "#f59e0b",
      "--approved-bg": "rgba(16,185,129,0.08)",
      "--approved-border": "#10b981",
      "--rejected-bg": "rgba(239,68,68,0.08)",
      "--rejected-border": "#ef4444",
    },
  },
  forest: {
    name: "Forest",
    icon: "🌲",
    vars: {
      "--bg-app": "#0d1a12",
      "--bg-surface": "#1a2e1f",
      "--bg-surface-2": "rgba(160,220,180,0.06)",
      "--bg-surface-3": "rgba(160,220,180,0.1)",
      "--bg-overlay": "rgba(0,0,0,0.7)",
      "--border": "rgba(160,220,180,0.15)",
      "--border-strong": "rgba(160,220,180,0.3)",
      "--text": "#e7f5ec",
      "--text-muted": "#8fb89e",
      "--text-dim": "#5a7a66",
      "--accent": "#22c55e",
      "--accent-hover": "#16a34a",
      "--accent-text": "#4ade80",
      "--credit": "#4ade80",
      "--debit": "#f87171",
      "--warning": "#facc15",
      "--info": "#38bdf8",
      "--purple": "#a78bfa",
      "--pending-bg": "rgba(250,204,21,0.1)",
      "--pending-border": "#facc15",
      "--approved-bg": "rgba(34,197,94,0.08)",
      "--approved-border": "#22c55e",
      "--rejected-bg": "rgba(239,68,68,0.08)",
      "--rejected-border": "#ef4444",
    },
  },
  grey: {
    name: "Grey",
    icon: "🩶",
    vars: {
      "--bg-app": "#1c1c1e",
      "--bg-surface": "#2c2c2e",
      "--bg-surface-2": "rgba(255,255,255,0.06)",
      "--bg-surface-3": "rgba(255,255,255,0.1)",
      "--bg-overlay": "rgba(0,0,0,0.7)",
      "--border": "rgba(255,255,255,0.12)",
      "--border-strong": "rgba(255,255,255,0.22)",
      "--text": "#f2f2f7",
      "--text-muted": "#aeaeb2",
      "--text-dim": "#8e8e93",
      "--accent": "#8e8e93",
      "--accent-hover": "#636366",
      "--accent-text": "#d1d1d6",
      "--credit": "#30d158",
      "--debit": "#ff453a",
      "--warning": "#ffd60a",
      "--info": "#64d2ff",
      "--purple": "#bf5af2",
      "--pending-bg": "rgba(255,214,10,0.08)",
      "--pending-border": "#ffd60a",
      "--approved-bg": "rgba(48,209,88,0.08)",
      "--approved-border": "#30d158",
      "--rejected-bg": "rgba(255,69,58,0.08)",
      "--rejected-border": "#ff453a",
    },
  },
};

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved && THEMES[saved] ? saved : "dark";
  });

  useEffect(() => {
    const vars = (THEMES[themeKey] || THEMES.dark).vars;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute("data-theme", themeKey);
    localStorage.setItem("theme", themeKey);
  }, [themeKey]);

  return (
    <ThemeContext.Provider
      value={{
        themeKey,
        setTheme: setThemeKey,
        availableThemes: Object.entries(THEMES).map(([key, t]) => ({
          key,
          name: t.name,
          icon: t.icon,
        })),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};
