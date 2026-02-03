import React, { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { db } from "../../services/db";
import { Button, Card, Badge } from "../ui";
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

  // Session state: track streak and intro shown per item
  const [sessionState, setSessionState] = useState(new Map());

  const sessionInitialized = useRef(false);
  const wordsRef = useRef(words);
  const inputRef = useRef(null);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Generate verb options for verbForm items
  const generateVerbOptions = useCallback((item) => {
    if (!item || item.type !== "verbForm") return [];

    const allForms = wordsRef.current.filter(
      w => w.type === 'verbForm' && w.verbId === item.verbId
    );

    const correctForm = item.form;
    const otherForms = allForms
      .filter(f => f.form !== correctForm)
      .map(f => f.form);

    const uniqueOtherForms = [...new Set(otherForms)];
    const shuffled = uniqueOtherForms.sort(() => Math.random() - 0.5);
    const wrongOptions = shuffled.slice(0, 2);

    return [correctForm, ...wrongOptions].sort(() => Math.random() - 0.5);
  }, []);

  // Create question from example
  const createQuestion = useCallback((item) => {
    if (!item?.example) return { sentence: "", blank: "" };

    let target = "";
    if (item.type === "verbForm") {
      target = item.form;
    } else if (item.type === "noun" && item.article) {
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

  // Prepare for showing a question
  const prepareQuestion = useCallback(
    (item) => {
      if (item?.type === "verbForm") {
        const newOptions = generateVerbOptions(item);
        setOptions(newOptions);
      } else {
        setOptions([]);
      }
      setAnswer("");
      setIsCorrect(null);
      
      // Focus input after render
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [generateVerbOptions]
  );

  // Move to next item
  const moveToNext = useCallback(() => {
    const incompleteItems = getIncompleteItems();

    if (incompleteItems.length === 0) {
      setPhase("complete");
      return;
    }

    let nextItem = null;
    let nextIndex = currentIndex;

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

    if (needsIntro(nextItem)) {
      setPhase("intro");
    } else {
      prepareQuestion(nextItem);
      setPhase("question");
    }
  }, [currentIndex, session, sessionState, settings.requiredStreak, getIncompleteItems, needsIntro, prepareQuestion]);

  // Initialize session
  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    const items = selectLearningItems(words, settings.poolSize);
    setSession(items);
    setCurrentIndex(0);

    const initialState = new Map();
    items.forEach((item) => {
      initialState.set(getItemId(item), { streak: 0, shownIntro: false });
    });
    setSessionState(initialState);

    if (items.length === 0) {
      setPhase("complete");
    } else {
      const firstItem = items[0];
      if (firstItem.level === 0) {
        setPhase("intro");
      } else {
        setPhase("question");
        if (firstItem.type === "verbForm") {
          setTimeout(() => {
            setOptions(generateVerbOptions(firstItem));
          }, 0);
        }
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, []);

  const currentItem = session[currentIndex];

  // Auto-advance from intro after 4 seconds
  useEffect(() => {
    if (phase !== "intro" || !currentItem) return;

    const timer = setTimeout(() => {
      // Mark intro as shown
      const itemId = getItemId(currentItem);
      setSessionState((prev) => {
        const newState = new Map(prev);
        const current = newState.get(itemId) || { streak: 0, shownIntro: false };
        newState.set(itemId, { ...current, shownIntro: true });
        return newState;
      });

      prepareQuestion(currentItem);
      setPhase("question");
    }, 4000);

    return () => clearTimeout(timer);
  }, [phase, currentItem, prepareQuestion]);

  // Auto-advance from feedback after delay
  useEffect(() => {
    if (phase !== "feedback") return;

    const delay = isCorrect ? 1500 : 2500; // Shorter for correct, longer for wrong
    const timer = setTimeout(() => {
      moveToNext();
    }, delay);

    return () => clearTimeout(timer);
  }, [phase, isCorrect, moveToNext]);

  const updateProgress = async (item, correct, newSessionStreak) => {
    const currentWords = wordsRef.current;
    const word = currentWords.find(w => w.id === item.id);
    
    if (!word) return;

    const { level, lastLevelChange } = calculateNewLevel(
      word.level || 0,
      correct,
      newSessionStreak,
      word.lastLevelChange,
      settings.requiredStreak
    );

    await db.words.put({ ...word, level, lastLevelChange });
    await refreshWords();
  };

  const handleAnswer = async (selectedAnswer) => {
    if (phase !== "question") return;
    
    const question = createQuestion(currentItem);
    const correct =
      currentItem.type === "verbForm"
        ? selectedAnswer === currentItem.form
        : validateAnswer(selectedAnswer, question.blank, currentItem);

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

    await updateProgress(currentItem, correct, correct ? newStreak : 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && answer.trim()) {
      handleAnswer(answer.trim());
    }
  };

  // Calculate progress
  const completedCount = session.filter((item) => {
    const itemId = getItemId(item);
    const state = sessionState.get(itemId);
    return (state?.streak || 0) >= settings.requiredStreak;
  }).length;

  const progress = session.length > 0 ? (completedCount / session.length) * 100 : 0;

  // Render intro card (auto-dismisses after 4s)
  const renderIntro = () => {
    if (!currentItem) return null;

    const isVerbForm = currentItem.type === "verbForm";
    const displayWord = isVerbForm
      ? `${currentItem.word} (${TENSE_LABELS[currentItem.tense]}, ${PERSONS[currentItem.person - 1]})`
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
        <div className="intro-timer">
          <div className="intro-timer-bar" />
        </div>
      </Card>
    );
  };

  // Render question
  const renderQuestion = () => {
    if (!currentItem) return null;

    const question = createQuestion(currentItem);
    const isVerbForm = currentItem.type === "verbForm";
    const itemId = getItemId(currentItem);
    const state = sessionState.get(itemId);
    const currentStreak = state?.streak || 0;

    return (
      <Card className="learning-card question-card">
        <div className="question-header">
          <span className="question-polish">{currentItem.word}</span>
          {isVerbForm && (
            <Badge variant="accent">
              {TENSE_LABELS[currentItem.tense]} • {PERSONS[currentItem.person - 1]}
            </Badge>
          )}
          <div className="streak-dots">
            {Array.from({ length: settings.requiredStreak }).map((_, i) => (
              <span 
                key={i} 
                className={`streak-dot ${i < currentStreak ? 'filled' : ''}`}
              />
            ))}
          </div>
        </div>

        <p className="question-sentence">{question.sentence}</p>
        <p className="question-hint">{currentItem.example_pl}</p>

        {isVerbForm ? (
          <div className="verb-options">
            {options.map((opt, idx) => (
              <button
                key={idx}
                className="verb-option-btn"
                onClick={() => handleAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            className="answer-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz odpowiedź..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        )}
      </Card>
    );
  };

  // Render feedback (auto-dismisses)
  const renderFeedback = () => {
    if (!currentItem) return null;

    const question = createQuestion(currentItem);
    const itemId = getItemId(currentItem);
    const state = sessionState.get(itemId);
    const currentStreak = state?.streak || 0;
    const isComplete = currentStreak >= settings.requiredStreak;

    return (
      <Card className={`learning-card feedback-card ${isCorrect ? "correct" : "incorrect"}`}>
        <div className="feedback-icon">{isCorrect ? "✓" : "✗"}</div>
        <div className="feedback-answer">
          {question.blank}
        </div>
        {isCorrect && isComplete && (
          <div className="feedback-complete">🎉 Zaliczone!</div>
        )}
        {!isCorrect && (
          <div className="feedback-hint">Spróbuj ponownie</div>
        )}
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

  return (
    <div className="learning-view">
      <header className="learning-header">
        <Button variant="ghost" onClick={() => setView("database")}>
          ← Wróć
        </Button>
        <div className="session-progress">
          {completedCount} / {session.length}
        </div>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="learning-content">
        {phase === "loading" && (
          <Card className="learning-card">
            <p>Ładowanie...</p>
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
