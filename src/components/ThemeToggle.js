import React from "react";
import { useApp } from "../context/AppContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useApp();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
};

export default ThemeToggle;
