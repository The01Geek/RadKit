export interface ScreenshotRecord {
  id?: number;
  fullImage: Blob;
  thumbnail: string; // JPEG data URL for quick grid display
  timestamp: string; // ISO 8601
  tags: string[];
  captureMode: string;
  url?: string;
  title?: string;
}

const DB_NAME = 'radkit-history';
const STORE_NAME = 'screenshots';
const DB_VERSION = 1;
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

export const HistoryStore = {
  async add(record: Omit<ScreenshotRecord, 'id'>): Promise<number> {
    const db = await openDB();
    try {
      // Use a single readwrite transaction for atomic count + prune + add
      return await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const countReq = store.count();
        countReq.onsuccess = () => {
          const count = countReq.result;

          const doAdd = () => {
            const addReq = store.add(record);
            addReq.onsuccess = () => resolve(addReq.result as number);
            addReq.onerror = () => reject(addReq.error);
          };

          if (count >= MAX_RECORDS) {
            // Delete the oldest entry before adding
            const idx = store.index('timestamp');
            const cursor = idx.openCursor(); // ascending = oldest first
            cursor.onsuccess = () => {
              if (cursor.result) {
                cursor.result.delete();
              }
              doAdd();
            };
            cursor.onerror = () => reject(cursor.error);
          } else {
            doAdd();
          }
        };
        countReq.onerror = () => reject(countReq.error);

        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },

  async getById(id: number): Promise<ScreenshotRecord | undefined> {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  },

  async getAll(excludeFullImage = false): Promise<ScreenshotRecord[]> {
    const db = await openDB();
    try {
      const records = await new Promise<ScreenshotRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => {
          let results = req.result;
          if (excludeFullImage) {
            results = results.map(({ fullImage, ...rest }) => rest as ScreenshotRecord);
          }
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
      // Return newest first
      return records.sort((a, b) => b.timestamp!.localeCompare(a.timestamp!));
    } finally {
      db.close();
    }
  },

  async search(query: {
    tagText?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ScreenshotRecord[]> {
    const all = await this.getAll(true);
    return all.filter((r) => {
      if (query.tagText) {
        const q = query.tagText.toLowerCase();
        const hasTag = r.tags.some((t) => t.toLowerCase().includes(q));
        if (!hasTag) return false;
      }
      if (query.startDate && r.timestamp < query.startDate) return false;
      if (query.endDate && r.timestamp > query.endDate) return false;
      return true;
    });
  },

  async updateTags(id: number, tags: string[]): Promise<void> {
    const db = await openDB();
    try {
      const record = await new Promise<ScreenshotRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (!record) return;
      record.tags = tags;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  },

  async delete(id: number): Promise<void> {
    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  },

  async getCount(): Promise<number> {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  },

  async getFullImage(id: number): Promise<string | null> {
    const record = await this.getById(id);
    if (!record) return null;
    // Convert Blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(record.fullImage);
    });
  },
};
