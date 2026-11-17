// Lokaler Speicher (IndexedDB). Fällt der Browser-Speicher aus (z. B. in
// eingebetteten Ansichten), läuft das Spiel ohne Speichern weiter.

const DB_NAME = 'outpost', STORE = 'saves';
let dbPromise = null;
const memory = new Map();
export let storageAvailable = true;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    } catch (err) { reject(err); }
  }).catch((err) => { storageAvailable = false; console.warn('IndexedDB nicht verfügbar – es wird nicht dauerhaft gespeichert.', err); return null; });
  return dbPromise;
}

function tx(mode, fn) {
  return open().then((db) => {
    if (!db) return fn(null);       // ohne Datenbank: Wert direkt aus dem Arbeitsspeicher
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  });
}

export function saveSlot(key, data) {
  return tx('readwrite', (s) => { if (!s) { memory.set(key, data); return undefined; } return s.put(data, key); })
    .catch((err) => { console.warn('Speichern fehlgeschlagen', err); memory.set(key, data); });
}

export function loadSlot(key) {
  return tx('readonly', (s) => (s ? s.get(key) : memory.get(key)))
    .catch((err) => { console.warn('Laden fehlgeschlagen', err); return memory.get(key); });
}
