import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { DatabaseView, LearningView } from "./components/views";
import ThemeToggle from "./components/ThemeToggle";
import "./styles/index.css";

const AppContent = () => {
  const { view, loading } = useApp();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">📚</div>
        <p>Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <ThemeToggle />
      {view === "database" && <DatabaseView />}
      {view === "learning" && <LearningView />}
    </div>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
