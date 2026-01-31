import { DB_NAME, DB_VERSION, STORE_WORDS, STORE_SETTINGS } from '../constants';

let dbInstance = null;

const openDB = () => new Promise((resolve, reject) => {
  if (dbInstance) return resolve(dbInstance);
  
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    dbInstance = request.result;
    resolve(dbInstance);
  };
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    
    // Create words store with string keyPath for UUID
    if (!db.objectStoreNames.contains(STORE_WORDS)) {
      const wordsStore = db.createObjectStore(STORE_WORDS, { keyPath: 'id' });
      wordsStore.createIndex('type', 'type', { unique: false });
      wordsStore.createIndex('verbId', 'verbId', { unique: false });
    }
    
    if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
      db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
    }
  };
});

const dbOperation = async (storeName, mode, operation) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generate unique ID using crypto.randomUUID()
const generateId = () => crypto.randomUUID();

export const db = {
  words: {
    getAll: () => dbOperation(STORE_WORDS, 'readonly', s => s.getAll()),
    get: (id) => dbOperation(STORE_WORDS, 'readonly', s => s.get(id)),
    add: (word) => {
      const id = word.id || generateId();
      return dbOperation(STORE_WORDS, 'readwrite', s => s.add({ ...word, id }));
    },
    put: (word) => dbOperation(STORE_WORDS, 'readwrite', s => s.put(word)),
    delete: (id) => dbOperation(STORE_WORDS, 'readwrite', s => s.delete(id)),
    
    // Get all verb forms for a specific verb
    getVerbForms: async (verbId) => {
      const all = await db.words.getAll();
      return all.filter(w => w.type === 'verbForm' && w.verbId === verbId);
    },
    
    // Delete verb and all its forms
    deleteVerbWithForms: async (verbId) => {
      const all = await db.words.getAll();
      const toDelete = all.filter(w => w.id === verbId || w.verbId === verbId);
      for (const word of toDelete) {
        await db.words.delete(word.id);
      }
    },
    
    // Clear all words
    clear: async () => {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_WORDS, 'readwrite');
        const store = tx.objectStore(STORE_WORDS);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
  },
  
  settings: {
    get: async (key) => {
      const result = await dbOperation(STORE_SETTINGS, 'readonly', s => s.get(key));
      return result?.value;
    },
    set: (key, value) => dbOperation(STORE_SETTINGS, 'readwrite', s => s.put({ key, value })),
  },
  
  // Export entire database to JSON
  export: async () => {
    const words = await db.words.getAll();
    const settings = {};
    
    // Get all settings
    const settingsKeys = ['apiKey', 'poolSize', 'autoAddVerbs', 'autoAddAdjectives', 'autoAddNouns', 'requiredStreak', 'theme'];
    for (const key of settingsKeys) {
      const value = await db.settings.get(key);
      if (value !== undefined) {
        settings[key] = value;
      }
    }
    
    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      words,
      settings,
    };
  },
  
  // Import database from JSON
  import: async (data, options = { clearExisting: false }) => {
    if (options.clearExisting) {
      await db.words.clear();
    }
    
    const existingWords = await db.words.getAll();
    const existingIds = new Set(existingWords.map(w => w.id));
    
    let imported = 0;
    let skipped = 0;
    
    for (const word of data.words || []) {
      if (existingIds.has(word.id)) {
        skipped++;
        continue;
      }
      
      // Ensure the word has a valid ID
      const wordWithId = {
        ...word,
        id: word.id || generateId(),
      };
      
      await db.words.add(wordWithId);
      imported++;
    }
    
    // Optionally import settings (excluding API key for security)
    if (data.settings) {
      const { apiKey, ...safeSettings } = data.settings;
      for (const [key, value] of Object.entries(safeSettings)) {
        await db.settings.set(key, value);
      }
    }
    
    return { imported, skipped };
  },
  
  // Generate new ID (exported for external use)
  generateId,
};

export default db;
