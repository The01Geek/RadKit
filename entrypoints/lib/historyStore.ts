export interface ScreenshotRecord {
  id?: number;
  fullImage: Blob;
  thumbnail: Blob;
  timestamp: string;
  tags: string[];
  captureMode: string;
  url: string;
  title: string;
}

export interface ScreenshotMeta {
  id: number;
  timestamp: string;
  tags: string[];
  captureMode: string;
  url: string;
  title: string;
}

const DB_NAME = 'radkit-history';
const DB_VERSION = 1;
const STORE_NAME = 'screenshots';
const MAX_RECORDS = 100;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        store.createIndex('captureMode', 'captureMode', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          reject(tx.error);
          db.close();
        };
      })
  );
}

async function prune(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count < MAX_RECORDS) {
        resolve();
        return;
      }

      const toDelete = count - MAX_RECORDS + 1;
      const index = store.index('timestamp');
      const cursorReq = index.openCursor();
      let deleted = 0;

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && deleted < toDelete) {
          store.delete(cursor.primaryKey);
          deleted++;
          cursor.continue();
        }
      };
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const HistoryStore = {
  async add(record: Omit<ScreenshotRecord, 'id'>): Promise<number> {
    await prune();
    return withTransaction('readwrite', (store) =>
      store.add(record)
    ) as Promise<number>;
  },

  async getById(id: number): Promise<ScreenshotRecord | undefined> {
    return withTransaction('readonly', (store) => store.get(id));
  },

  async getAll(
    options: { offset?: number; limit?: number } = {}
  ): Promise<ScreenshotRecord[]> {
    const { offset = 0, limit = 50 } = options;
    const db = await openDB();

    return new Promise<ScreenshotRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const results: ScreenshotRecord[] = [];
      let skipped = 0;

      const cursorReq = index.openCursor(null, 'prev');

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve(results);
          return;
        }
        if (skipped < offset) {
          skipped++;
          cursor.continue();
          return;
        }
        if (results.length < limit) {
          results.push(cursor.value as ScreenshotRecord);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      cursorReq.onerror = () => reject(cursorReq.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  },

  async getAllMeta(): Promise<ScreenshotMeta[]> {
    const db = await openDB();

    return new Promise<ScreenshotMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const results: ScreenshotMeta[] = [];

      const cursorReq = index.openCursor(null, 'prev');

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve(results);
          return;
        }
        const rec = cursor.value as ScreenshotRecord;
        results.push({
          id: rec.id!,
          timestamp: rec.timestamp,
          tags: rec.tags,
          captureMode: rec.captureMode,
          url: rec.url,
          title: rec.title,
        });
        cursor.continue();
      };

      cursorReq.onerror = () => reject(cursorReq.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  },

  async getThumbnail(id: number): Promise<Blob | undefined> {
    const record = await this.getById(id);
    return record?.thumbnail;
  },

  async search(query: {
    tag?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ScreenshotRecord[]> {
    const all = await this.getAll({ limit: MAX_RECORDS });
    return all.filter((rec) => {
      if (query.tag) {
        const q = query.tag.toLowerCase();
        const hasTag = rec.tags.some((t) => t.toLowerCase().includes(q));
        if (!hasTag) return false;
      }
      if (query.dateFrom && rec.timestamp < query.dateFrom) return false;
      if (query.dateTo && rec.timestamp > query.dateTo) return false;
      return true;
    });
  },

  async updateTags(id: number, tags: string[]): Promise<void> {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.tags = tags;
          store.put(record);
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  },

  async delete(id: number): Promise<void> {
    await withTransaction('readwrite', (store) => store.delete(id));
  },

  async count(): Promise<number> {
    return withTransaction('readonly', (store) => store.count());
  },

  async getFullImage(id: number): Promise<Blob | undefined> {
    const record = await this.getById(id);
    return record?.fullImage;
  },
};
