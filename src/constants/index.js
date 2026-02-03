export const DB_NAME = "vocabulary-db";
export const DB_VERSION = 4; // Clean schema - no redundant fields in verbForm/adjective
export const STORE_WORDS = "words";
export const STORE_SETTINGS = "settings";

export const POOL_SIZE = 20;
export const MAX_LEVEL = 100;
export const REQUIRED_STREAK = 2;

export const AUTO_ADD_VERBS = 1;
export const AUTO_ADD_ADJECTIVES = 2;
export const AUTO_ADD_NOUNS = 4;

// New type system
export const WORD_TYPES = ["noun", "verb", "verbForm", "adjective"];

export const TYPE_LABELS = {
  noun: "Rzeczownik",
  verb: "Czasownik",
  verbForm: "Forma czasownika",
  adjective: "Przymiotnik",
};

// For API/import compatibility
export const PARTS_OF_SPEECH = ["noun", "verb", "adjective"];

export const POS_LABELS = {
  noun: "Rzeczownik",
  verb: "Czasownik",
  adjective: "Przymiotnik",
};

export const TENSE_LABELS = {
  present: "Teraźniejszy",
  past: "Przeszły",
  future: "Przyszły",
};

export const PERSONS = [
  "yo",
  "tú",
  "él/ella",
  "nosotros",
  "vosotros",
  "ellos/ellas",
];

export const ARTICLE_ALTERNATIVES = {
  el: "un",
  un: "el",
  la: "una",
  una: "la",
  los: "unos",
  unos: "los",
  las: "unas",
  unas: "las",
};

export const LEVEL_CHANGE_COOLDOWN = 24 * 60 * 60 * 1000;
