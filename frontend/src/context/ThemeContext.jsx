// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const THEMES = {
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
    name: "Midnight",
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
    root.setAttribute("data-theme", themeKey); // 👈 add this
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
