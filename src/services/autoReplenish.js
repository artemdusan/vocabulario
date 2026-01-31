import { db } from "./db";
import { countInLearningByType, getAvailableByType } from "../utils";

/**
 * Auto-replenish learning pool when a type runs out
 */
export const autoReplenishLearning = async (words, settings, refreshWords) => {
  const counts = countInLearningByType(words);
  const { autoAddVerbs, autoAddAdjectives, autoAddNouns } = settings;

  let updated = false;

  // Replenish verbs
  if (counts.verb === 0 && autoAddVerbs > 0) {
    const available = getAvailableByType(words, "verb");
    const toAdd = available.slice(0, autoAddVerbs);

    for (const verb of toAdd) {
      // Add verb and all its forms to learning
      const updatedForms =
        verb.forms?.map((f) => ({
          ...f,
          in_learning: true,
          level: 0,
          lastLevelChange: null,
        })) || [];

      await db.words.put({
        ...verb,
        in_learning: true,
        level: 0,
        lastLevelChange: null,
        forms: updatedForms,
      });
      updated = true;
    }
  }

  // Replenish adjectives
  if (counts.adjective === 0 && autoAddAdjectives > 0) {
    const available = getAvailableByType(words, "adjective");
    const toAdd = available.slice(0, autoAddAdjectives);

    for (const word of toAdd) {
      await db.words.put({
        ...word,
        in_learning: true,
        level: 0,
        lastLevelChange: null,
      });
      updated = true;
    }
  }

  // Replenish nouns
  if (counts.noun === 0 && autoAddNouns > 0) {
    const available = getAvailableByType(words, "noun");
    const toAdd = available.slice(0, autoAddNouns);

    for (const word of toAdd) {
      await db.words.put({
        ...word,
        in_learning: true,
        level: 0,
        lastLevelChange: null,
      });
      updated = true;
    }
  }

  if (updated) {
    await refreshWords();
  }

  return updated;
};
