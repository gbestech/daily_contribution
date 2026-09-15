// src/context/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

// Kept only for labels/icons in the theme switcher UI.
// Actual colors live in your CSS file's [data-theme="..."] blocks.
export const THEMES = {
  light: { name: "Light", icon: "☀️" },
  dark: { name: "Dark", icon: "🌙" },
  moonlight: { name: "Moonlight", icon: "🌌" },
  forest: { name: "Forest", icon: "🌲" },
  grey: { name: "Grey", icon: "🩶" },
};

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved && THEMES[saved] ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeKey);
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
