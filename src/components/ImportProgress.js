import React from "react";
import { Card } from "./ui";

const ImportProgress = ({ progress }) => {
  if (!progress) return null;

  const percentage = (progress.current / progress.total) * 100;

  return (
    <div className="import-progress-overlay">
      <Card className="import-progress-card">
        <h3>📥 Importowanie słów...</h3>
        <div className="import-progress-info">
          <span className="current-word">{progress.currentWord}</span>
          <span className="progress-count">
            {progress.current} / {progress.total}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        {progress.errors.length > 0 && (
          <div className="import-errors">
            <span className="error-count">
              ⚠️ {progress.errors.length} błędów
            </span>
          </div>
        )}
        <p className="import-note">
          Nie zamykaj tej strony. Import może potrwać kilka minut.
        </p>
      </Card>
    </div>
  );
};

export default ImportProgress;
