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
    if (!db.objectStoreNames.contains(STORE_WORDS)) {
      db.createObjectStore(STORE_WORDS, { keyPath: 'id', autoIncrement: true });
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

export const db = {
  words: {
    getAll: () => dbOperation(STORE_WORDS, 'readonly', s => s.getAll()),
    get: (id) => dbOperation(STORE_WORDS, 'readonly', s => s.get(id)),
    add: (word) => dbOperation(STORE_WORDS, 'readwrite', s => s.add({ ...word, id: Date.now() + Math.random() })),
    put: (word) => dbOperation(STORE_WORDS, 'readwrite', s => s.put(word)),
    delete: (id) => dbOperation(STORE_WORDS, 'readwrite', s => s.delete(id)),
  },
  settings: {
    get: async (key) => {
      const result = await dbOperation(STORE_SETTINGS, 'readonly', s => s.get(key));
      return result?.value;
    },
    set: (key, value) => dbOperation(STORE_SETTINGS, 'readwrite', s => s.put({ key, value })),
  }
};

export default db;
