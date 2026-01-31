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
export const getDisplayTranslation = (word) => {
  if (word.type === "noun" && word.article) {
    return `${word.article} ${word.translation}`;
  }
  if (word.type === "verbForm") {
    return word.form;
  }
  return word.translation;
};

/**
 * Get unique ID for an item
 */
export const getItemId = (item) => item.id;

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
  if (item?.type === "noun" && item?.article) {
    const alt = getAltArticle(item.article);
    const altExpected = normalize(`${alt} ${item.translation}`);
    if (inp === altExpected) return true;
  }

  // Accent-forgiving for lower levels (< 50)
  const level = item?.level ?? 0;
  if (level < 50) {
    if (removeAccents(inp) === removeAccents(exp)) return true;

    // Also check alternative article without accents
    if (item?.type === "noun" && item?.article) {
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
 * Now works with flat structure where verbForms are separate entries
 */
export const selectLearningItems = (words, poolSize) => {
  const items = [];

  words.forEach((w) => {
    // Include all words that are in learning and have examples
    if (w.in_learning && w.example) {
      items.push(w);
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
  const counts = { noun: 0, verb: 0, verbForm: 0, adjective: 0 };

  words.forEach((w) => {
    if (w.in_learning) {
      counts[w.type] = (counts[w.type] || 0) + 1;
    }
  });

  return counts;
};

/**
 * Get words not in learning by type
 */
export const getAvailableByType = (words, type) => {
  return words.filter(
    (w) => w.type === type && !w.in_learning
  );
};

/**
 * Get verb forms for a specific verb
 */
export const getVerbForms = (words, verbId) => {
  return words.filter(w => w.type === 'verbForm' && w.verbId === verbId);
};

/**
 * Group words: verbs with their forms
 */
export const groupWordsWithForms = (words) => {
  const verbs = words.filter(w => w.type === 'verb');
  const verbForms = words.filter(w => w.type === 'verbForm');
  const others = words.filter(w => w.type !== 'verb' && w.type !== 'verbForm');
  
  const verbsWithForms = verbs.map(verb => ({
    ...verb,
    forms: verbForms.filter(f => f.verbId === verb.id),
  }));
  
  return { verbsWithForms, others, all: words };
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
    if (sessionStreak >= requiredStreak && currentLevel < MAX_LEVEL) {
      newLevel = currentLevel + 1;
      newLastLevelChange = Date.now();
    }
  } else {
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
