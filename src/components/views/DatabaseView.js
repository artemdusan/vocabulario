import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { db } from "../../services/db";
import { generateWordData, generateExamples } from "../../services/api";
import { Button, Input, Badge, Toast } from "../ui";
import {
  AddWordModal,
  SettingsModal,
  ImportCSVModal,
  ViewWordModal,
  EditWordModal,
  DeleteConfirmModal,
} from "../modals";
import ImportProgress from "../ImportProgress";
import { POS_LABELS } from "../../constants";
import { getDisplayTranslation, delay } from "../../utils";
import { autoReplenishLearning } from "../../services/autoReplenish";
import { countInLearningByType } from "../../utils";

const DatabaseView = () => {
  const { words, refreshWords, setView, settings, saveSettings } = useApp();

  // UI state
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Filtered and sorted words
  const filteredWords = useMemo(
    () =>
      words
        .filter(
          (w) =>
            w.word?.toLowerCase().includes(search.toLowerCase()) ||
            w.translation?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => (a.level || 0) - (b.level || 0)),
    [words, search]
  );

  // Auto-replenish on view load
  useEffect(() => {
    autoReplenishLearning(words, settings, refreshWords);
  }, [words, settings, refreshWords]);

  // Count by type for stats
  const inLearningByType = useMemo(() => countInLearningByType(words), [words]);

  // Statistics
  const stats = useMemo(() => {
    let total = 0,
      inLearning = 0;
    const levels = [0, 0, 0, 0, 0, 0];

    words.forEach((w) => {
      if (w.partOfSpeech === "verb" && w.forms) {
        w.forms.forEach((f) => {
          total++;
          if (f.in_learning) inLearning++;
          levels[f.level || 0]++;
        });
      } else {
        total++;
        if (w.in_learning) inLearning++;
        levels[w.level || 0]++;
      }
    });

    return { total, inLearning, levels };
  }, [words]);

  const canStartLearning = stats.inLearning > 0;

  // Handlers
  const handleAddWord = async (data) => {
    if (!settings.apiKey) {
      setToast({ message: "Ustaw klucz API w ustawieniach", type: "error" });
      return;
    }

    setAdding(true);
    try {
      const wordData = await generateWordData(
        data.word,
        data.partOfSpeech,
        settings.apiKey
      );
      const examples = await generateExamples(wordData, settings.apiKey);

      let forms = null;
      if (
        wordData.partOfSpeech === "verb" &&
        wordData.forms &&
        examples.forms_examples
      ) {
        forms = [];
        for (const tense of ["present", "past", "future"]) {
          wordData.forms[tense]?.forEach((form, idx) => {
            const ex = examples.forms_examples.find(
              (e) => e.tense === tense && e.person === idx + 1
            );
            forms.push({
              tense,
              person: idx + 1,
              form,
              translation_form: ex?.translation_form || "",
              example: ex?.example || "",
              example_pl: ex?.example_pl || "",
              level: 0,
              streak: 0,
              in_learning: false,
            });
          });
        }
      }

      await db.words.add({
        word: wordData.word,
        translation: wordData.translation,
        partOfSpeech: wordData.partOfSpeech,
        article: wordData.article || null,
        example: examples.example || "",
        example_pl: examples.example_pl || "",
        forms,
        level: 0,
        streak: 0,
        in_learning: false,
      });

      await refreshWords();
      setShowAddModal(false);
      setToast({ message: "Słowo dodane!", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleImportCSV = async (csvRows) => {
    if (!settings.apiKey) {
      setToast({ message: "Ustaw klucz API w ustawieniach", type: "error" });
      return;
    }

    const existingWords = new Set(
      words.map((w) => `${w.word}-${w.partOfSpeech}`)
    );
    const newRows = csvRows.filter(
      (r) => !existingWords.has(`${r.word}-${r.partOfSpeech}`)
    );

    if (newRows.length === 0) {
      setToast({
        message: "Wszystkie słowa już istnieją w bazie",
        type: "info",
      });
      return;
    }

    setShowImportModal(false);

    const errors = [];
    const BATCH_SIZE = 5;

    const processWord = async (row) => {
      try {
        const wordData = await generateWordData(
          row.word,
          row.partOfSpeech,
          settings.apiKey
        );
        const examples = await generateExamples(wordData, settings.apiKey);

        let forms = null;
        if (
          wordData.partOfSpeech === "verb" &&
          wordData.forms &&
          examples.forms_examples
        ) {
          forms = [];
          for (const tense of ["present", "past", "future"]) {
            wordData.forms[tense]?.forEach((form, idx) => {
              const ex = examples.forms_examples.find(
                (e) => e.tense === tense && e.person === idx + 1
              );
              forms.push({
                tense,
                person: idx + 1,
                form,
                translation_form: ex?.translation_form || "",
                example: ex?.example || "",
                example_pl: ex?.example_pl || "",
                level: 0,
                streak: 0,
                in_learning: false,
              });
            });
          }
        }

        await db.words.add({
          word: wordData.word,
          translation: wordData.translation,
          partOfSpeech: wordData.partOfSpeech,
          article: wordData.article || null,
          example: examples.example || "",
          example_pl: examples.example_pl || "",
          forms,
          level: 0,
          streak: 0,
          in_learning: false,
        });

        return { success: true, word: row.word };
      } catch (err) {
        return { success: false, word: row.word, error: err.message };
      }
    };

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const batchWords = batch.map((r) => r.word).join(", ");

      setImportProgress({
        current: Math.min(i + BATCH_SIZE, newRows.length),
        total: newRows.length,
        errors: [...errors],
        currentWord: batchWords,
      });

      const results = await Promise.all(batch.map(processWord));

      results.forEach((r) => {
        if (!r.success) {
          errors.push({ word: r.word, error: r.error });
        }
      });

      if (i + BATCH_SIZE < newRows.length) {
        await delay(1500);
      }
    }

    await refreshWords();
    setImportProgress(null);

    const successCount = newRows.length - errors.length;
    if (errors.length > 0) {
      setToast({
        message: `Zaimportowano ${successCount} słów. ${errors.length} błędów.`,
        type: "warning",
      });
    } else {
      setToast({
        message: `Zaimportowano ${successCount} słów!`,
        type: "success",
      });
    }
  };

  const handleSaveWord = async (updatedWord) => {
    await db.words.put(updatedWord);
    await refreshWords();
    setShowEditModal(null);
    setToast({ message: "Zapisano zmiany", type: "success" });
  };

  const handleDeleteWord = async (word) => {
    await db.words.delete(word.id);
    await refreshWords();
    setDeleteConfirm(null);
    setShowEditModal(null);
    setToast({ message: "Słowo usunięte", type: "success" });
  };

  return (
    <div className="database-view">
      {/* Header */}
      <header className="header">
        <h1>📚 Vocabulario</h1>
        <p className="subtitle">Twoja baza słówek hiszpańskich</p>
      </header>

      {/* Toolbar */}
      <div className="toolbar">
        <Button
          onClick={() => setShowAddModal(true)}
          disabled={adding || importProgress}
        >
          {adding ? "⏳ Dodawanie..." : "➕ Dodaj słowo"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowImportModal(true)}
          disabled={adding || importProgress}
        >
          📥 Import CSV
        </Button>
        <Button variant="secondary" onClick={() => setShowSettingsModal(true)}>
          ⚙️ Ustawienia
        </Button>
        <Button
          variant="accent"
          onClick={() => setView("learning")}
          disabled={!canStartLearning || importProgress}
        >
          🎓 Rozpocznij naukę
        </Button>
      </div>

      {/* Import Progress */}
      <ImportProgress progress={importProgress} />

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{words.length}</span>
          <span className="stat-label">Słów</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.inLearning}</span>
          <span className="stat-label">W nauce</span>
        </div>
        <div className="stat stat-type">
          <span className="stat-value">{inLearningByType.verb || 0}</span>
          <span className="stat-label">🔄 Czasowniki</span>
        </div>
        <div className="stat stat-type">
          <span className="stat-value">{inLearningByType.adjective || 0}</span>
          <span className="stat-label">📝 Przymiotniki</span>
        </div>
        <div className="stat stat-type">
          <span className="stat-value">{inLearningByType.noun || 0}</span>
          <span className="stat-label">📦 Rzeczowniki</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Input
          placeholder="🔍 Szukaj słów..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Word List */}
      <div className="word-list">
        {filteredWords.length === 0 ? (
          <div className="empty-state">
            <p>
              Brak słów{search ? " pasujących do wyszukiwania" : " w bazie"}
            </p>
            {!search && <p>Dodaj pierwsze słowo, aby rozpocząć!</p>}
          </div>
        ) : (
          filteredWords.map((word) => (
            <div
              key={word.id}
              className={`word-card ${word.in_learning ? "in-learning" : ""}`}
              onClick={() => setShowViewModal(word)}
            >
              <div className="word-main">
                <span className="word-polish">{word.word}</span>
                <span className="word-spanish">
                  {getDisplayTranslation(word)}
                </span>
              </div>
              <div className="word-meta">
                <Badge>{POS_LABELS[word.partOfSpeech]}</Badge>
                <Badge variant={word.level >= 4 ? "success" : "default"}>
                  Lv.{word.level || 0}
                </Badge>
                {word.in_learning && <Badge variant="accent">W nauce</Badge>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <AddWordModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddWord}
        loading={adding}
      />

      <SettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSave={saveSettings}
      />

      <ImportCSVModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCSV}
        existingWords={words}
      />

      <ViewWordModal
        word={showViewModal}
        onClose={() => setShowViewModal(null)}
        onEdit={(w) => {
          setShowViewModal(null);
          setShowEditModal(w);
        }}
      />

      <EditWordModal
        word={showEditModal}
        onClose={() => setShowEditModal(null)}
        onSave={handleSaveWord}
        onDelete={(w) => {
          setShowEditModal(null);
          setDeleteConfirm(w);
        }}
      />

      <DeleteConfirmModal
        word={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteWord}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default DatabaseView;
