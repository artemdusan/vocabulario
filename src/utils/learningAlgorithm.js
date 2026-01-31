import {
  ARTICLE_ALTERNATIVES,
  MAX_LEVEL,
  LEVEL_CHANGE_COOLDOWN,
} from "../constants";

/**
 * Remove accents from string for comparison
 */
export const removeAccents = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

/**
 * Get alternative article (el <-> un, la <-> una, etc.)
 */
export const getAltArticle = (article) =>
  ARTICLE_ALTERNATIVES[article?.toLowerCase()] || article;

/**
 * Get display translation with article for nouns
 */
export const getDisplayTranslation = (word) =>
  word.partOfSpeech === "noun" && word.article
    ? `${word.article} ${word.translation}`
    : word.translation;

/**
 * Flatten verb forms into individual learnable items
 */
export const flattenVerbForms = (verb) => {
  if (verb.partOfSpeech !== "verb" || !verb.forms) return [];
  return verb.forms.map((f) => ({
    ...f,
    _id: `${verb.id}_${f.tense}_${f.person}`,
    type: "verbform",
    verbId: verb.id,
    word: verb.word,
    translation: verb.translation,
    partOfSpeech: "verb",
    in_learning: f.in_learning ?? verb.in_learning ?? false,
  }));
};

/**
 * Get unique ID for an item (works for both words and verb forms)
 */
export const getItemId = (item) => {
  if (item.type === "verbform") {
    return item._id || `${item.verbId}_${item.tense}_${item.person}`;
  }
  return item.id;
};

/**
 * Validate user's answer against expected answer
 */
export const validateAnswer = (input, expected, item) => {
  if (!input || !expected) return false;

  const normalize = (s) => s.toLowerCase().trim();
  const inp = normalize(input);
  const exp = normalize(expected);

  // Exact match
  if (inp === exp) return true;

  // For nouns, check with alternative article
  if (item?.partOfSpeech === "noun" && item?.article) {
    const alt = getAltArticle(item.article);
    const altExpected = normalize(`${alt} ${item.translation}`);
    if (inp === altExpected) return true;
  }

  // Accent-forgiving for lower levels (< 50)
  const level = item?.level ?? 0;
  if (level < 50) {
    if (removeAccents(inp) === removeAccents(exp)) return true;

    // Also check alternative article without accents
    if (item?.partOfSpeech === "noun" && item?.article) {
      const alt = getAltArticle(item.article);
      const altExpected = removeAccents(
        normalize(`${alt} ${item.translation}`)
      );
      if (removeAccents(inp) === altExpected) return true;
    }
  }

  return false;
};

/**
 * Select items for learning session based on level (lower = higher probability)
 */
export const selectLearningItems = (words, poolSize) => {
  const items = [];

  words.forEach((w) => {
    if (w.partOfSpeech === "verb" && w.forms) {
      flattenVerbForms(w).forEach((f) => {
        if (f.in_learning && f.example) items.push(f);
      });
    } else if (w.in_learning && w.example) {
      items.push({ ...w, type: "word" });
    }
  });

  // Weighted random selection (lower levels = higher weight)
  const weighted = items.map((item) => ({
    item,
    weight: 1 / Math.sqrt((item.level || 0) + 1),
  }));

  const selected = [];
  const available = [...weighted];

  while (selected.length < poolSize && available.length > 0) {
    const totalWeight = available.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
      random -= available[i].weight;
      if (random <= 0) {
        selected.push(available[i].item);
        available.splice(i, 1);
        break;
      }
    }
  }

  // Shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
};

/**
 * Count words in learning by type
 */
export const countInLearningByType = (words) => {
  const counts = { noun: 0, verb: 0, adjective: 0 };

  words.forEach((w) => {
    if (w.in_learning) {
      counts[w.partOfSpeech] = (counts[w.partOfSpeech] || 0) + 1;
    }
  });

  return counts;
};

/**
 * Get words not in learning by type
 */
export const getAvailableByType = (words, type) => {
  return words.filter(
    (w) =>
      w.partOfSpeech === type &&
      !w.in_learning &&
      (type !== "verb" || w.forms?.length > 0)
  );
};

/**
 * Check if level can be decreased (24h cooldown)
 */
export const canDecreaseLevel = (lastLevelChange) => {
  if (!lastLevelChange) return true;
  return Date.now() - lastLevelChange >= LEVEL_CHANGE_COOLDOWN;
};

/**
 * Calculate new level after answer
 * @param {number} currentLevel - Current level (0-100)
 * @param {boolean} isCorrect - Whether the answer was correct
 * @param {number} sessionStreak - Consecutive correct answers in session
 * @param {number|null} lastLevelChange - Timestamp of last level change
 * @param {number} requiredStreak - Required streak for level up (default 2)
 * @returns {{ level: number, lastLevelChange: number|null }}
 */
export const calculateNewLevel = (
  currentLevel,
  isCorrect,
  sessionStreak,
  lastLevelChange,
  requiredStreak = 2
) => {
  let newLevel = currentLevel;
  let newLastLevelChange = lastLevelChange;

  if (isCorrect) {
    // Level up when reaching required streak
    if (sessionStreak >= requiredStreak && currentLevel < MAX_LEVEL) {
      newLevel = currentLevel + 1;
      newLastLevelChange = Date.now();
    }
  } else {
    // Level down on wrong answer (with cooldown check, min 0)
    if (currentLevel > 0 && canDecreaseLevel(lastLevelChange)) {
      newLevel = currentLevel - 1;
      newLastLevelChange = Date.now();
    }
  }

  return {
    level: newLevel,
    lastLevelChange: newLastLevelChange,
  };
};

/**
 * Helper delay function
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
