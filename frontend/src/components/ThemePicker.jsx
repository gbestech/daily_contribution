import React from "react";
import { useTheme } from "../context/ThemeContext";

const ThemePicker = () => {
  const { themeKey, setTheme, availableThemes } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {availableThemes.map((t) => {
        const active = t.key === themeKey;
        return (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            title={`Switch to ${t.name}`}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              border: active
                ? "2px solid var(--accent)"
                : "1px solid var(--border)",
              background: active
                ? "var(--bg-surface-3)"
                : "var(--bg-surface-2)",
              color: active ? "var(--accent-text)" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
          >
            {t.icon} {t.name}
          </button>
        );
      })}
    </div>
  );
};

export default ThemePicker;
