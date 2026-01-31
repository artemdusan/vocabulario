import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { db } from "../services/db";
import {
  POOL_SIZE,
  AUTO_ADD_VERBS,
  AUTO_ADD_ADJECTIVES,
  AUTO_ADD_NOUNS,
  REQUIRED_STREAK,
} from "../constants";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [words, setWords] = useState([]);
  const [settings, setSettings] = useState({
    apiKey: "",
    poolSize: POOL_SIZE,
    autoAddVerbs: AUTO_ADD_VERBS,
    autoAddAdjectives: AUTO_ADD_ADJECTIVES,
    autoAddNouns: AUTO_ADD_NOUNS,
    requiredStreak: REQUIRED_STREAK,
  });
  const [view, setView] = useState("database");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("dark");

  const refreshWords = useCallback(async () => {
    const data = await db.words.getAll();
    setWords(data);
  }, []);

  const loadSettings = useCallback(async () => {
    const apiKey = (await db.settings.get("apiKey")) || "";
    const poolSize = (await db.settings.get("poolSize")) || POOL_SIZE;
    const autoAddVerbs =
      (await db.settings.get("autoAddVerbs")) ?? AUTO_ADD_VERBS;
    const autoAddAdjectives =
      (await db.settings.get("autoAddAdjectives")) ?? AUTO_ADD_ADJECTIVES;
    const autoAddNouns =
      (await db.settings.get("autoAddNouns")) ?? AUTO_ADD_NOUNS;
    const requiredStreak =
      (await db.settings.get("requiredStreak")) ?? REQUIRED_STREAK;
    const savedTheme = (await db.settings.get("theme")) || "dark";

    setSettings({
      apiKey,
      poolSize,
      autoAddVerbs,
      autoAddAdjectives,
      autoAddNouns,
      requiredStreak,
    });
    setTheme(savedTheme);
  }, []);

  const saveSettings = useCallback(async (newSettings) => {
    await db.settings.set("apiKey", newSettings.apiKey);
    await db.settings.set("poolSize", newSettings.poolSize);
    await db.settings.set("autoAddVerbs", newSettings.autoAddVerbs);
    await db.settings.set("autoAddAdjectives", newSettings.autoAddAdjectives);
    await db.settings.set("autoAddNouns", newSettings.autoAddNouns);
    await db.settings.set("requiredStreak", newSettings.requiredStreak);
    setSettings(newSettings);
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await db.settings.set("theme", newTheme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      await refreshWords();
      await loadSettings();
      setLoading(false);
    };
    init();
  }, [refreshWords, loadSettings]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const value = {
    words,
    refreshWords,
    settings,
    saveSettings,
    view,
    setView,
    loading,
    theme,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export default AppContext;
