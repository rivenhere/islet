/**
 * DBHelper: the single access point for local storage (IndexedDB + localStorage)
 *
 * It only "reads and writes values by key" and knows nothing about business logic. Business code just calls it:
 *
 *   import { DBHelper } from "@/utils/dbHelper";
 *
 *   // IndexedDB (async, large capacity, can store Blob / File / ArrayBuffer and more)
 *   await DBHelper.set("wallpaper", blob);
 *   const img = await DBHelper.get<Blob>("wallpaper");
 *
 *   // Namespaces: isolated by prefix within one database, and clear() only clears its own keys
 *   const cache = DBHelper.namespace("icon-cache");
 *   await cache.set("github", svg);
 *
 *   // localStorage (synchronous, small capacity, for small settings needed before first paint)
 *   DBHelper.local.set("foo", { a: 1 });
 *   DBHelper.local.get("foo", { a: 0 });
 *
 * How to choose: data that may grow, or binary data → IndexedDB;
 *          must be read synchronously (such as before first render) and small → local.
 *
 * Robustness: no method throws storage-layer errors (private mode, quota full, corrupted data and so on).
 * Failed reads return undefined or the default value, and failed writes return false.
 * If IndexedDB is unavailable it falls back to localStorage (keys prefixed `islet-db:`), invisibly to callers;
 * after that only JSON data can be stored, and writing binary data (Blob / ArrayBuffer and so on) returns false.
 */

/** IndexedDB database name / object store name / version */
const DB_NAME = "islet";
const STORE_NAME = "kv";
const DB_VERSION = 1;

/** Key prefix for the localStorage fallback when IndexedDB is unavailable */
const FALLBACK_PREFIX = "islet-db:";

/** Async key-value store (IndexedDB or its fallback) */
export interface AsyncStore {
  /** Read; returns undefined if missing or failed */
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** Write; returns whether it succeeded */
  set<T = unknown>(key: string, value: T): Promise<boolean>;
  /** Delete; returns whether it succeeded */
  remove(key: string): Promise<boolean>;
  /** List all keys (within a namespace, without the prefix) */
  keys(): Promise<string[]>;
  /** Clear (within a namespace, only its own keys); returns whether it succeeded */
  clear(): Promise<boolean>;
  /** Derive a child namespace: keys get a `name:` prefix automatically */
  namespace(name: string): AsyncStore;
}

/** Minimal Web Storage-compatible interface (for third-party libraries such as pinia persistence) */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ---------------------------------------------------------------------------
// localStorage (synchronous)
// ---------------------------------------------------------------------------

/** Get localStorage safely (some environments throw on access) */
const getLocalStorage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** Raw string reads and writes, swallowing errors */
const rawLocal: StorageLike = {
  getItem(key) {
    try {
      return getLocalStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      getLocalStorage()?.setItem(key, value);
    } catch {
      // Fail silently when the quota is full or storage is unavailable
    }
  },
  removeItem(key) {
    try {
      getLocalStorage()?.removeItem(key);
    } catch {
      // Fail silently
    }
  },
};

const localKeys = (): string[] => {
  const ls = getLocalStorage();
  if (!ls) return [];
  try {
    return Array.from({ length: ls.length }, (_, i) => ls.key(i)).filter(
      (k): k is string => k !== null,
    );
  } catch {
    return [];
  }
};

/** Synchronous JSON reads and writes on localStorage */
const local = {
  /** Read and parse JSON; returns fallback if missing or corrupted */
  get<T>(key: string, fallback?: T): T | undefined {
    const raw = rawLocal.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  /** Serialize to JSON and write; returns whether it succeeded */
  set<T>(key: string, value: T): boolean {
    const ls = getLocalStorage();
    if (!ls) return false;
    try {
      ls.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    rawLocal.removeItem(key);
  },

  /** All keys */
  keys: localKeys,

  /**
   * Raw string interface, for libraries with their own serialization (such as pinia-plugin-persistedstate),
   * so they also access localStorage through DBHelper.
   */
  storage: rawLocal,
};

// ---------------------------------------------------------------------------
// IndexedDB (async)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null;

/** Open (and cache) the database; null if unavailable, which then uses the fallback */
const openDB = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Give up the connection when another tab upgrades the version; the next call reopens it
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
};

/** Run one request on the object store, handling the transaction and errors */
const runRequest = async <R>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<R>,
): Promise<{ ok: true; result: R } | { ok: false }> => {
  const db = await openDB();
  if (!db) return { ok: false };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const req = action(tx.objectStore(STORE_NAME));
      let result: R;
      req.onsuccess = () => (result = req.result);
      // Wait for the transaction to complete, so the write is really on disk
      tx.oncomplete = () => resolve({ ok: true, result });
      tx.onerror = () => resolve({ ok: false });
      tx.onabort = () => resolve({ ok: false });
    } catch {
      resolve({ ok: false });
    }
  });
};

/** IndexedDB only stores structured-cloneable values; non-cloneable ones like reactive proxies fall back to a JSON deep copy */
const toCloneable = <T>(value: T): T => {
  try {
    structuredClone(value);
    return value;
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
};

/** Whether it contains binary data that can't become JSON (not storable in the localStorage fallback) */
const hasBinary = (value: unknown, seen = new Set<unknown>()): boolean => {
  if (value === null || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    return true;
  }
  return Object.values(value).some((v) => hasBinary(v, seen));
};

/** Key range: all string keys starting with prefix */
const prefixRange = (prefix: string): IDBKeyRange | undefined =>
  prefix ? IDBKeyRange.bound(prefix, prefix + "￿") : undefined;

/** Create an async store with a prefix; an empty prefix means the whole database */
const createAsyncStore = (prefix: string): AsyncStore => {
  const full = (key: string) => prefix + key;
  const fallbackKey = (key: string) => FALLBACK_PREFIX + prefix + key;

  const store: AsyncStore = {
    async get<T>(key: string) {
      const res = await runRequest("readonly", (s) => s.get(full(key)));
      if (res.ok) return res.result as T | undefined;
      return local.get<T>(fallbackKey(key));
    },

    async set<T>(key: string, value: T) {
      let cloneable: T;
      try {
        cloneable = toCloneable(value);
      } catch {
        return false; // Neither cloneable nor JSON-serializable (such as circular references)
      }
      const db = await openDB();
      if (!db) {
        if (hasBinary(cloneable)) return false;
        return local.set(fallbackKey(key), cloneable);
      }
      const res = await runRequest("readwrite", (s) =>
        s.put(cloneable, full(key)),
      );
      return res.ok;
    },

    async remove(key: string) {
      const db = await openDB();
      if (!db) {
        local.remove(fallbackKey(key));
        return true;
      }
      return (await runRequest("readwrite", (s) => s.delete(full(key)))).ok;
    },

    async keys() {
      const res = await runRequest("readonly", (s) =>
        s.getAllKeys(prefixRange(prefix)),
      );
      if (res.ok) {
        return res.result.map((k) => String(k).slice(prefix.length));
      }
      const fbPrefix = FALLBACK_PREFIX + prefix;
      return localKeys()
        .filter((k) => k.startsWith(fbPrefix))
        .map((k) => k.slice(fbPrefix.length));
    },

    async clear() {
      const db = await openDB();
      if (!db) {
        const fbPrefix = FALLBACK_PREFIX + prefix;
        localKeys()
          .filter((k) => k.startsWith(fbPrefix))
          .forEach((k) => local.remove(k));
        return true;
      }
      const range = prefixRange(prefix);
      return (
        await runRequest("readwrite", (s) =>
          range ? s.delete(range) : s.clear(),
        )
      ).ok;
    },

    namespace(name: string) {
      return createAsyncStore(`${prefix}${name}:`);
    },
  };
  return store;
};

/** Whether IndexedDB is really in use (false means it fell back to localStorage) */
const isIndexedDBAvailable = async (): Promise<boolean> =>
  (await openDB()) !== null;

/**
 * Global storage helper: root methods use IndexedDB, and `local` uses localStorage.
 */
export const DBHelper = Object.assign(createAsyncStore(""), {
  local,
  isIndexedDBAvailable,
});
