import React, { useState, useMemo, useEffect, useRef } from "react";
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
  DataManagementModal,
} from "../modals";
import ImportProgress from "../ImportProgress";
import { TYPE_LABELS, TENSE_LABELS, PERSONS } from "../../constants";
import { getDisplayTranslation, delay, groupWordsWithForms, countInLearningByType } from "../../utils";
import { autoReplenishLearning } from "../../services/autoReplenish";

const DatabaseView = () => {
  const { words, refreshWords, setView, settings, saveSettings } = useApp();

  // UI state
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [expandedVerbs, setExpandedVerbs] = useState(new Set());

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Group words with forms
  const { verbsWithForms, others } = useMemo(() => groupWordsWithForms(words), [words]);

  // Filtered and sorted words
  const filteredItems = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    // Filter verbs with forms
    const filteredVerbs = verbsWithForms.filter(v => 
      v.word?.toLowerCase().includes(searchLower) ||
      v.translation?.toLowerCase().includes(searchLower) ||
      v.forms.some(f => f.form?.toLowerCase().includes(searchLower))
    );
    
    // Filter other words
    const filteredOthers = others.filter(w =>
      w.word?.toLowerCase().includes(searchLower) ||
      w.translation?.toLowerCase().includes(searchLower)
    );
    
    // Combine and sort
    const all = [
      ...filteredVerbs.map(v => ({ ...v, _isVerb: true })),
      ...filteredOthers.map(w => ({ ...w, _isVerb: false })),
    ].sort((a, b) => (a.level || 0) - (b.level || 0));
    
    return all;
  }, [verbsWithForms, others, search]);

  // Auto-replenish on view load
  useEffect(() => {
    autoReplenishLearning(words, settings, refreshWords);
  }, [words, settings, refreshWords]);

  // Count by type for stats
  const inLearningByType = useMemo(() => countInLearningByType(words), [words]);

  // Statistics
  const stats = useMemo(() => {
    let total = 0, inLearning = 0;
    const levels = [0, 0, 0, 0, 0, 0];

    words.forEach(w => {
      total++;
      if (w.in_learning) inLearning++;
      levels[Math.min(w.level || 0, 5)]++;
    });

    return { total, inLearning, levels };
  }, [words]);

  const canStartLearning = stats.inLearning > 0;

  // Toggle verb expansion
  const toggleVerbExpand = (verbId, e) => {
    e.stopPropagation();
    setExpandedVerbs(prev => {
      const next = new Set(prev);
      if (next.has(verbId)) {
        next.delete(verbId);
      } else {
        next.add(verbId);
      }
      return next;
    });
  };

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

      if (wordData.type === "verb" && wordData.forms && examples.forms_examples) {
        // Create verb entry (infinitive)
        const verbId = db.generateId();
        await db.words.add({
          id: verbId,
          word: wordData.word,
          translation: wordData.translation,
          type: "verb",
          example: examples.forms_examples[0]?.example || "",
          example_pl: examples.forms_examples[0]?.example_pl || "",
          level: 0,
          streak: 0,
          in_learning: false,
        });

        // Create verb form entries (without word/translation - derived from parent)
        for (const tense of ["present", "past", "future"]) {
          const tenseForms = wordData.forms[tense] || [];
          tenseForms.forEach((formText, idx) => {
            const ex = examples.forms_examples.find(
              e => e.tense === tense && e.person === idx + 1
            );
            
            db.words.add({
              id: db.generateId(),
              verbId,
              type: "verbForm",
              tense,
              person: idx + 1,
              form: formText,
              form_pl: ex?.form_pl || "",
              example: ex?.example || "",
              example_pl: ex?.example_pl || "",
              level: 0,
              streak: 0,
              in_learning: false,
            });
          });
        }
      } else {
        // Non-verb word (article only for nouns)
        const wordEntry = {
          id: db.generateId(),
          word: wordData.word,
          translation: wordData.translation,
          type: wordData.type,
          example: examples.example || "",
          example_pl: examples.example_pl || "",
          level: 0,
          streak: 0,
          in_learning: false,
        };
        
        // Only add article for nouns
        if (wordData.type === "noun" && wordData.article) {
          wordEntry.article = wordData.article;
        }
        
        await db.words.add(wordEntry);
      }

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
      words.filter(w => w.type !== 'verbForm').map(w => `${w.word}-${w.type}`)
    );
    const newRows = csvRows.filter(
      r => !existingWords.has(`${r.word}-${r.partOfSpeech}`)
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

        if (wordData.type === "verb" && wordData.forms && examples.forms_examples) {
          const verbId = db.generateId();
          await db.words.add({
            id: verbId,
            word: wordData.word,
            translation: wordData.translation,
            type: "verb",
            example: examples.forms_examples[0]?.example || "",
            example_pl: examples.forms_examples[0]?.example_pl || "",
            level: 0,
            streak: 0,
            in_learning: false,
          });

          // Create verb form entries (without word/translation)
          for (const tense of ["present", "past", "future"]) {
            const tenseForms = wordData.forms[tense] || [];
            tenseForms.forEach((formText, idx) => {
              const ex = examples.forms_examples.find(
                e => e.tense === tense && e.person === idx + 1
              );
              
              db.words.add({
                id: db.generateId(),
                verbId,
                type: "verbForm",
                tense,
                person: idx + 1,
                form: formText,
                form_pl: ex?.form_pl || "",
                example: ex?.example || "",
                example_pl: ex?.example_pl || "",
                level: 0,
                streak: 0,
                in_learning: false,
              });
            });
          }
        } else {
          // Non-verb word (article only for nouns)
          const wordEntry = {
            id: db.generateId(),
            word: wordData.word,
            translation: wordData.translation,
            type: wordData.type,
            example: examples.example || "",
            example_pl: examples.example_pl || "",
            level: 0,
            streak: 0,
            in_learning: false,
          };
          
          if (wordData.type === "noun" && wordData.article) {
            wordEntry.article = wordData.article;
          }
          
          await db.words.add(wordEntry);
        }

        return { success: true, word: row.word };
      } catch (err) {
        return { success: false, word: row.word, error: err.message };
      }
    };

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const batchWords = batch.map(r => r.word).join(", ");

      setImportProgress({
        current: Math.min(i + BATCH_SIZE, newRows.length),
        total: newRows.length,
        errors: [...errors],
        currentWord: batchWords,
      });

      const results = await Promise.all(batch.map(processWord));

      results.forEach(r => {
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
    if (word.type === "verb") {
      // Delete verb and all its forms
      await db.words.deleteVerbWithForms(word.id);
    } else {
      await db.words.delete(word.id);
    }
    await refreshWords();
    setDeleteConfirm(null);
    setShowEditModal(null);
    setToast({ message: "Słowo usunięte", type: "success" });
  };

  // Data management handlers
  const handleExportJSON = async () => {
    try {
      const data = await db.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocabulario-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "Eksport zakończony!", type: "success" });
    } catch (err) {
      setToast({ message: `Błąd eksportu: ${err.message}`, type: "error" });
    }
  };

  const handleImportJSON = async (file, clearExisting) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await db.import(data, { clearExisting });
      await refreshWords();
      setShowDataModal(false);
      setToast({ 
        message: `Zaimportowano ${result.imported} wpisów${result.skipped > 0 ? `, pominięto ${result.skipped}` : ''}`, 
        type: "success" 
      });
    } catch (err) {
      setToast({ message: `Błąd importu: ${err.message}`, type: "error" });
    }
  };

  const handleClearDatabase = async () => {
    try {
      await db.words.clear();
      await refreshWords();
      setShowDataModal(false);
      setToast({ message: "Baza danych wyczyszczona", type: "success" });
    } catch (err) {
      setToast({ message: `Błąd: ${err.message}`, type: "error" });
    }
  };

  // Get parent verb for a form (for display)
  const getParentVerb = (verbId) => {
    return words.find(w => w.id === verbId);
  };

  // Render verb form row
  const renderVerbFormRow = (form, parentVerb) => (
    <div 
      key={form.id} 
      className={`verb-form-row ${form.in_learning ? 'in-learning' : ''}`}
      onClick={() => setShowViewModal({ ...form, word: parentVerb?.word, translation: parentVerb?.translation })}
    >
      <div className="form-info">
        <span className="form-person">{PERSONS[form.person - 1]}</span>
        <span className="form-tense">{TENSE_LABELS[form.tense]}</span>
        <span className="form-text">{form.form}</span>
        <span className="form-pl">{form.form_pl}</span>
      </div>
      <div className="form-meta">
        <Badge variant={form.level >= 4 ? "success" : "default"}>
          Lv.{form.level || 0}
        </Badge>
        {form.in_learning && <Badge variant="accent">W nauce</Badge>}
      </div>
    </div>
  );

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
        <Button variant="secondary" onClick={() => setShowDataModal(true)}>
          💾 Baza danych
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
          <span className="stat-value">{words.filter(w => w.type !== 'verbForm').length}</span>
          <span className="stat-label">Słów</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.inLearning}</span>
          <span className="stat-label">W nauce</span>
        </div>
        <div className="stat stat-type">
          <span className="stat-value">{inLearningByType.verbForm || 0}</span>
          <span className="stat-label">🔄 Formy czasowników</span>
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
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Word List */}
      <div className="word-list">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>
              Brak słów{search ? " pasujących do wyszukiwania" : " w bazie"}
            </p>
            {!search && <p>Dodaj pierwsze słowo, aby rozpocząć!</p>}
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="word-entry">
              <div
                className={`word-card ${item.in_learning ? "in-learning" : ""} ${item._isVerb ? "is-verb" : ""}`}
                onClick={() => setShowViewModal(item)}
              >
                <div className="word-main">
                  <span className="word-polish">{item.word}</span>
                  <span className="word-spanish">
                    {getDisplayTranslation(item)}
                  </span>
                </div>
                <div className="word-meta">
                  <Badge>{TYPE_LABELS[item.type]}</Badge>
                  {item.type !== 'verb' && (
                    <Badge variant={item.level >= 4 ? "success" : "default"}>
                      Lv.{item.level || 0}
                    </Badge>
                  )}
                  {item.in_learning && <Badge variant="accent">W nauce</Badge>}
                  {item._isVerb && item.forms?.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => toggleVerbExpand(item.id, e)}
                      className="expand-btn"
                    >
                      {expandedVerbs.has(item.id) ? "▼" : "▶"} {item.forms.length} form
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Expanded verb forms */}
              {item._isVerb && expandedVerbs.has(item.id) && item.forms && (
                <div className="verb-forms-list">
                  {['present', 'past', 'future'].map(tense => {
                    const tenseForms = item.forms.filter(f => f.tense === tense);
                    if (tenseForms.length === 0) return null;
                    return (
                      <div key={tense} className="tense-group">
                        <div className="tense-label">{TENSE_LABELS[tense]}</div>
                        {tenseForms
                          .sort((a, b) => a.person - b.person)
                          .map(form => renderVerbFormRow(form, item))}
                      </div>
                    );
                  })}
                </div>
              )}
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
        existingWords={words.filter(w => w.type !== 'verbForm')}
      />

      <DataManagementModal
        open={showDataModal}
        onClose={() => setShowDataModal(false)}
        onExport={handleExportJSON}
        onImport={handleImportJSON}
        onClear={handleClearDatabase}
        wordCount={words.length}
      />

      <ViewWordModal
        word={showViewModal}
        allWords={words}
        onClose={() => setShowViewModal(null)}
        onEdit={w => {
          setShowViewModal(null);
          setShowEditModal(w);
        }}
      />

      <EditWordModal
        word={showEditModal}
        allWords={words}
        onClose={() => setShowEditModal(null)}
        onSave={handleSaveWord}
        onDelete={w => {
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
