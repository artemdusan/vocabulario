import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { db } from "../../services/db";
import { Button, Input, Card, Badge } from "../ui";
import { TENSE_LABELS, PERSONS } from "../../constants";
import {
  selectLearningItems,
  validateAnswer,
  getDisplayTranslation,
  calculateNewLevel,
  getItemId,
} from "../../utils";

const LearningView = () => {
  const { words, refreshWords, setView, settings } = useApp();

  const [session, setSession] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("loading");
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Session state: track streak and intro shown per item
  // Map<itemId, { streak: number, shownIntro: boolean }>
  const [sessionState, setSessionState] = useState(new Map());

  const sessionInitialized = useRef(false);
  const wordsRef = useRef(words);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Generate verb options
  const generateVerbOptions = useCallback((item) => {
    if (!item || item.type !== "verbform") return [];

    const word = wordsRef.current.find((w) => w.id === item.verbId);
    if (!word?.forms) return [];

    const correctForm = item.form;
    const otherForms = word.forms
      .filter((f) => f.form !== correctForm)
      .map((f) => f.form);

    const shuffled = [...otherForms].sort(() => Math.random() - 0.5);
    const wrongOptions = shuffled.slice(0, 2);

    return [correctForm, ...wrongOptions].sort(() => Math.random() - 0.5);
  }, []);

  // Create question from example
  const createQuestion = useCallback((item) => {
    if (!item?.example) return { sentence: "", blank: "" };

    let target = "";
    if (item.type === "verbform") {
      target = item.form;
    } else if (item.partOfSpeech === "noun" && item.article) {
      target = `${item.article} ${item.translation}`;
    } else {
      target = item.translation;
    }

    const regex = new RegExp(
      target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );
    const sentence = item.example.replace(regex, "_____");

    return { sentence, blank: target };
  }, []);

  // Check if item needs intro (level 0 and hasn't shown intro in this session)
  const needsIntro = useCallback(
    (item) => {
      if (!item) return false;
      const itemId = getItemId(item);
      const state = sessionState.get(itemId);
      return item.level === 0 && !state?.shownIntro;
    },
    [sessionState]
  );

  // Get items that haven't completed required streak
  const getIncompleteItems = useCallback(() => {
    return session.filter((item) => {
      const itemId = getItemId(item);
      const state = sessionState.get(itemId);
      return (state?.streak || 0) < settings.requiredStreak;
    });
  }, [session, sessionState, settings.requiredStreak]);

  // Prepare for showing a question (set options for verbs)
  const prepareQuestion = useCallback(
    (item) => {
      if (item?.type === "verbform") {
        const newOptions = generateVerbOptions(item);
        setOptions(newOptions);
      } else {
        setOptions([]);
      }
      setAnswer("");
      setSelectedOption(null);
      setIsCorrect(null);
    },
    [generateVerbOptions]
  );

  // Initialize session ONLY ONCE
  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    const items = selectLearningItems(words, settings.poolSize);
    setSession(items);
    setCurrentIndex(0);

    // Initialize session state
    const initialState = new Map();
    items.forEach((item) => {
      initialState.set(getItemId(item), { streak: 0, shownIntro: false });
    });
    setSessionState(initialState);

    if (items.length === 0) {
      setPhase("complete");
    } else {
      const firstItem = items[0];
      // Check if first item needs intro
      if (firstItem.level === 0) {
        setPhase("intro");
      } else {
        setPhase("question");
        // Set options for first item if it's a verb
        if (firstItem.type === "verbform") {
          // We need to delay this slightly since wordsRef might not be ready
          setTimeout(() => {
            const opts = generateVerbOptions(firstItem);
            setOptions(opts);
          }, 0);
        }
      }
    }
  }, []);

  const currentItem = session[currentIndex];

  // Mark intro as shown and go to question
  const handleShowQuestion = () => {
    if (currentItem) {
      const itemId = getItemId(currentItem);
      setSessionState((prev) => {
        const newState = new Map(prev);
        const current = newState.get(itemId) || {
          streak: 0,
          shownIntro: false,
        };
        newState.set(itemId, { ...current, shownIntro: true });
        return newState;
      });
    }

    prepareQuestion(currentItem);
    setPhase("question");
  };

  const handleSubmitAnswer = async () => {
    const question = createQuestion(currentItem);
    const correct =
      currentItem.type === "verbform"
        ? selectedOption === currentItem.form
        : validateAnswer(answer, question.blank, currentItem);

    setIsCorrect(correct);
    setPhase("feedback");

    // Update session state
    const itemId = getItemId(currentItem);
    let newStreak = 0;

    setSessionState((prev) => {
      const newState = new Map(prev);
      const current = newState.get(itemId) || { streak: 0, shownIntro: false };

      if (correct) {
        newStreak = current.streak + 1;
      } else {
        newStreak = 0;
      }

      newState.set(itemId, { ...current, streak: newStreak });
      return newState;
    });

    // Update level in database
    await updateProgress(currentItem, correct, correct ? newStreak : 0);
  };

  const updateProgress = async (item, correct, newSessionStreak) => {
    const currentWords = wordsRef.current;

    if (item.type === "verbform") {
      const word = currentWords.find((w) => w.id === item.verbId);
      if (!word) return;

      const updatedForms = word.forms.map((f) => {
        if (f.tense === item.tense && f.person === item.person) {
          const { level, lastLevelChange } = calculateNewLevel(
            f.level || 0,
            correct,
            newSessionStreak,
            f.lastLevelChange,
            settings.requiredStreak
          );
          return { ...f, level, lastLevelChange };
        }
        return f;
      });

      await db.words.put({ ...word, forms: updatedForms });
    } else {
      const word = currentWords.find((w) => w.id === item.id);
      if (!word) return;

      const { level, lastLevelChange } = calculateNewLevel(
        word.level || 0,
        correct,
        newSessionStreak,
        word.lastLevelChange,
        settings.requiredStreak
      );

      await db.words.put({ ...word, level, lastLevelChange });
    }

    await refreshWords();
  };

  const handleNext = () => {
    // Get incomplete items (streak < required)
    const incompleteItems = getIncompleteItems();

    if (incompleteItems.length === 0) {
      // All items completed!
      setPhase("complete");
      return;
    }

    // Find next incomplete item (cycle through)
    let nextItem = null;
    let nextIndex = currentIndex;

    // Try to find next incomplete item after current index
    for (let i = 1; i <= session.length; i++) {
      const checkIndex = (currentIndex + i) % session.length;
      const item = session[checkIndex];
      const itemId = getItemId(item);
      const state = sessionState.get(itemId);

      if ((state?.streak || 0) < settings.requiredStreak) {
        nextItem = item;
        nextIndex = checkIndex;
        break;
      }
    }

    if (!nextItem) {
      setPhase("complete");
      return;
    }

    setCurrentIndex(nextIndex);

    // Check if needs intro (level 0 and not shown yet)
    if (needsIntro(nextItem)) {
      setPhase("intro");
    } else {
      prepareQuestion(nextItem);
      setPhase("question");
    }
  };

  // Calculate progress
  const completedCount = session.filter((item) => {
    const itemId = getItemId(item);
    const state = sessionState.get(itemId);
    return (state?.streak || 0) >= settings.requiredStreak;
  }).length;

  const progress =
    session.length > 0 ? (completedCount / session.length) * 100 : 0;

  // Render intro card (only for level 0, not shown before)
  const renderIntro = () => {
    if (!currentItem) return null;

    const isVerbForm = currentItem.type === "verbform";
    const displayWord = isVerbForm
      ? `${currentItem.word} (${TENSE_LABELS[currentItem.tense]}, ${
          PERSONS[currentItem.person - 1]
        })`
      : currentItem.word;
    const displayTranslation = isVerbForm
      ? currentItem.form
      : getDisplayTranslation(currentItem);

    return (
      <Card className="learning-card intro-card">
        <Badge variant="accent">Nowe słowo</Badge>
        <div className="intro-content">
          <span className="intro-polish">{displayWord}</span>
          <span className="intro-arrow">→</span>
          <span className="intro-spanish">{displayTranslation}</span>
        </div>
        {currentItem.example && (
          <div className="intro-example">
            <p className="example-es">{currentItem.example}</p>
            <p className="example-pl">{currentItem.example_pl}</p>
          </div>
        )}
        <Button onClick={handleShowQuestion}>Rozumiem, dalej →</Button>
      </Card>
    );
  };

  // Render question
  const renderQuestion = () => {
    if (!currentItem) return null;

    const question = createQuestion(currentItem);
    const isVerbForm = currentItem.type === "verbform";
    const itemId = getItemId(currentItem);
    const state = sessionState.get(itemId);
    const currentStreak = state?.streak || 0;

    return (
      <Card className="learning-card question-card">
        <div className="question-header">
          <span className="question-polish">{currentItem.word}</span>
          <Badge>Lv. {currentItem.level || 0}</Badge>
          <Badge variant={currentStreak > 0 ? "success" : "default"}>
            {currentStreak}/{settings.requiredStreak} ✓
          </Badge>
          {isVerbForm && (
            <Badge variant="accent">
              {TENSE_LABELS[currentItem.tense]} •{" "}
              {PERSONS[currentItem.person - 1]}
            </Badge>
          )}
        </div>

        <p className="question-sentence">{question.sentence}</p>
        <p className="question-hint">{currentItem.example_pl}</p>

        {isVerbForm ? (
          <div className="verb-options">
            {options.length > 0 ? (
              options.map((opt, idx) => (
                <Button
                  key={idx}
                  variant={selectedOption === opt ? "accent" : "secondary"}
                  onClick={() => setSelectedOption(opt)}
                >
                  {opt}
                </Button>
              ))
            ) : (
              <p className="loading-options">Ładowanie opcji...</p>
            )}
          </div>
        ) : (
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Wpisz odpowiedź..."
            autoFocus
            onKeyDown={(e) =>
              e.key === "Enter" && answer.trim() && handleSubmitAnswer()
            }
          />
        )}

        <Button
          onClick={handleSubmitAnswer}
          disabled={isVerbForm ? !selectedOption : !answer.trim()}
        >
          Sprawdź
        </Button>
      </Card>
    );
  };

  // Render feedback
  const renderFeedback = () => {
    if (!currentItem) return null;

    const question = createQuestion(currentItem);
    const itemId = getItemId(currentItem);
    const state = sessionState.get(itemId);
    const currentStreak = state?.streak || 0;
    const isComplete = currentStreak >= settings.requiredStreak;

    return (
      <Card
        className={`learning-card feedback-card ${
          isCorrect ? "correct" : "incorrect"
        }`}
      >
        <div className="feedback-icon">{isCorrect ? "✅" : "❌"}</div>
        <div className="feedback-message">
          {isCorrect
            ? isComplete
              ? "🎉 Słowo zaliczone!"
              : "Dobrze!"
            : "Niestety, błędna odpowiedź"}
        </div>
        <div className="correct-answer">
          Poprawna odpowiedź: <strong>{question.blank}</strong>
        </div>
        {isCorrect && !isComplete && (
          <p className="feedback-hint">
            Jeszcze {settings.requiredStreak - currentStreak} poprawna odpowiedź
            do zaliczenia.
          </p>
        )}
        {!isCorrect && (
          <p className="feedback-hint">
            Streak zresetowany. To słowo pojawi się ponownie.
          </p>
        )}
        <Button onClick={handleNext}>Dalej →</Button>
      </Card>
    );
  };

  // Render complete
  const renderComplete = () => (
    <Card className="learning-card complete-card">
      <div className="complete-icon">🎉</div>
      <h2>Sesja zakończona!</h2>
      <p>Wszystkie słowa zaliczone!</p>
      <Button onClick={() => setView("database")}>Wróć do bazy słów</Button>
    </Card>
  );

  // Count remaining
  const remainingCount = session.length - completedCount;

  return (
    <div className="learning-view">
      <header className="learning-header">
        <Button variant="ghost" onClick={() => setView("database")}>
          ← Wróć
        </Button>
        <div className="session-progress">
          <span>
            {completedCount} / {session.length} zaliczonych
          </span>
          {remainingCount > 0 && (
            <span className="remaining-count">
              ({remainingCount} pozostało)
            </span>
          )}
        </div>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="learning-content">
        {phase === "loading" && (
          <Card className="learning-card">
            <p>Ładowanie sesji...</p>
          </Card>
        )}
        {phase === "intro" && renderIntro()}
        {phase === "question" && renderQuestion()}
        {phase === "feedback" && renderFeedback()}
        {phase === "complete" && renderComplete()}
      </div>
    </div>
  );
};

export default LearningView;
