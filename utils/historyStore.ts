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
      // Prune oldest if at capacity
      const count = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (count >= MAX_RECORDS) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const idx = store.index('timestamp');
          const cursor = idx.openCursor(); // ascending = oldest first
          cursor.onsuccess = () => {
            if (cursor.result) {
              cursor.result.delete();
            }
            resolve();
          };
          cursor.onerror = () => reject(cursor.error);
        });
      }

      // Add the new record
      const id = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).add(record);
        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
      });

      return id;
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

  async getAll(): Promise<ScreenshotRecord[]> {
    const db = await openDB();
    try {
      const records = await new Promise<ScreenshotRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result);
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
    const all = await this.getAll();
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
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(record.fullImage);
    });
  },
};
