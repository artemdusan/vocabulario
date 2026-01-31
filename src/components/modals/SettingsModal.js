import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Select } from "../ui";

const SettingsModal = ({ open, onClose, settings, onSave }) => {
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [poolSize, setPoolSize] = useState(settings.poolSize || 20);
  const [autoAddVerbs, setAutoAddVerbs] = useState(settings.autoAddVerbs || 1);
  const [autoAddAdjectives, setAutoAddAdjectives] = useState(
    settings.autoAddAdjectives || 2
  );
  const [autoAddNouns, setAutoAddNouns] = useState(settings.autoAddNouns || 4);
  const [requiredStreak, setRequiredStreak] = useState(
    settings.requiredStreak || 2
  );

  useEffect(() => {
    setApiKey(settings.apiKey || "");
    setPoolSize(settings.poolSize || 20);
    setAutoAddVerbs(settings.autoAddVerbs ?? 1);
    setAutoAddAdjectives(settings.autoAddAdjectives ?? 2);
    setAutoAddNouns(settings.autoAddNouns ?? 4);
    setRequiredStreak(settings.requiredStreak ?? 2);
  }, [settings, open]);

  const handleSave = () => {
    onSave({
      ...settings,
      apiKey,
      poolSize,
      autoAddVerbs,
      autoAddAdjectives,
      autoAddNouns,
      requiredStreak,
    });
    onClose();
  };

  const numberOptions = (max, min = 0) =>
    Array.from({ length: max - min + 1 }, (_, i) => ({
      value: i + min,
      label: `${i + min}`,
    }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ustawienia"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>Zapisz</Button>
        </>
      }
    >
      <Input
        label="Klucz API OpenAI"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-..."
      />

      <Select
        label="Słów w sesji"
        value={poolSize}
        onChange={(e) => setPoolSize(Number(e.target.value))}
        options={[10, 20, 30, 40, 50].map((n) => ({
          value: n,
          label: `${n} słów`,
        }))}
      />

      <div className="settings-section">
        <h4>Nauka</h4>

        <Select
          label="Poprawne odpowiedzi do zaliczenia słowa"
          value={requiredStreak}
          onChange={(e) => setRequiredStreak(Number(e.target.value))}
          options={numberOptions(5, 1)}
        />
        <p className="settings-hint">
          Słowo musi uzyskać tyle poprawnych odpowiedzi pod rząd w sesji, aby
          zakończyć jego naukę i zwiększyć poziom.
        </p>
      </div>

      <div className="settings-section">
        <h4>Auto-uzupełnianie nauki</h4>
        <p className="settings-hint">
          Gdy zabraknie słów danego typu w nauce, automatycznie dodaj:
        </p>

        <Select
          label="Czasowniki (z odmianami)"
          value={autoAddVerbs}
          onChange={(e) => setAutoAddVerbs(Number(e.target.value))}
          options={numberOptions(5)}
        />

        <Select
          label="Przymiotniki"
          value={autoAddAdjectives}
          onChange={(e) => setAutoAddAdjectives(Number(e.target.value))}
          options={numberOptions(10)}
        />

        <Select
          label="Rzeczowniki"
          value={autoAddNouns}
          onChange={(e) => setAutoAddNouns(Number(e.target.value))}
          options={numberOptions(10)}
        />
      </div>

      <p className="settings-note">
        💡 Klucz API jest przechowywany lokalnie w przeglądarce.
      </p>
    </Modal>
  );
};

export default SettingsModal;
