import { db } from "./db";
import { countInLearningByType, getAvailableByType, getVerbForms } from "../utils";

/**
 * Auto-replenish learning pool when a type runs out
 */
export const autoReplenishLearning = async (words, settings, refreshWords) => {
  const counts = countInLearningByType(words);
  const { autoAddVerbs, autoAddAdjectives, autoAddNouns } = settings;

  let updated = false;

  // Replenish verbs (add verb and all its forms to learning)
  if (counts.verbForm === 0 && autoAddVerbs > 0) {
    const availableVerbs = getAvailableByType(words, "verb");
    const toAdd = availableVerbs.slice(0, autoAddVerbs);

    for (const verb of toAdd) {
      // Update the verb itself
      await db.words.put({
        ...verb,
        in_learning: true,
        level: 0,
        lastLevelChange: null,
      });

      // Update all verb forms
      const forms = getVerbForms(words, verb.id);
      for (const form of forms) {
        await db.words.put({
          ...form,
          in_learning: true,
          level: 0,
          lastLevelChange: null,
        });
      }
      
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
