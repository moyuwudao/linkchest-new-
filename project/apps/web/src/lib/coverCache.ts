// 封面本地缓存管理 - IndexedDB LRU (50MB上限)

const DB_NAME = 'LinkChestCoverCacheV2';
const DB_VERSION = 1;
const STORE_NAME = 'covers';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        store.createIndex('size', 'size', { unique: false });
      }
    };
  });
  return dbPromise;
}

function getCacheKey(url: string, collectionId?: string): string {
  // 对 URL 做简单哈希
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.charCodeAt(i);
    hash |= 0;
  }
  const urlHash = Math.abs(hash).toString(36);
  if (collectionId) return `cover_${collectionId}_${urlHash}`;
  return `cover_url_${urlHash}`;
}

async function getTotalSize(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      resolve(items.reduce((sum, item) => sum + (item.size || 0), 0));
    };
    req.onerror = () => reject(req.error);
  });
}

async function evictLRU(db: IDBDatabase, neededSpace: number): Promise<void> {
  const total = await getTotalSize(db);
  if (total + neededSpace <= MAX_CACHE_SIZE) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('lastAccessed');
    const req = idx.openCursor();
    let freed = 0;
    const toDelete: string[] = [];

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || freed >= neededSpace) {
        toDelete.forEach(id => store.delete(id));
        return resolve();
      }
      const item = cursor.value;
      toDelete.push(item.id);
      freed += item.size || 0;
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

// 追踪活跃的 Blob URL，用于内存释放
const activeBlobUrls = new Map<string, string>(); // blobUrl -> cacheKey

/** 从缓存获取封面 Blob URL，未命中返回 null */
export async function getCachedCover(url: string, collectionId?: string): Promise<string | null> {
  try {
    const db = await openDB();
    const id = getCacheKey(url, collectionId);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (!item) return resolve(null);
        // 更新访问时间
        item.lastAccessed = Date.now();
        store.put(item);
        const blobUrl = URL.createObjectURL(item.blob);
        activeBlobUrls.set(blobUrl, id);
        resolve(blobUrl);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** 释放指定的 Blob URL（对应 getCachedCover 创建的 URL） */
export function revokeCachedCover(blobUrl: string): void {
  try {
    URL.revokeObjectURL(blobUrl);
    activeBlobUrls.delete(blobUrl);
  } catch {
    // ignore
  }
}

/** 获取当前活跃的 Blob URL 数量（用于调试） */
export function getActiveBlobUrlCount(): number {
  return activeBlobUrls.size;
}

/** 将封面存入缓存 */
export async function setCachedCover(url: string, blob: Blob, collectionId?: string): Promise<void> {
  try {
    const db = await openDB();
    await evictLRU(db, blob.size);
    const id = getCacheKey(url, collectionId);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.put({
        id,
        url,
        blob,
        size: blob.size,
        lastAccessed: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // 静默失败，不影响主流程
  }
}

/** 清空封面缓存 */
export async function clearCoverCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

/** 获取缓存统计 */
export async function getCacheStats(): Promise<{ count: number; totalSize: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        resolve({
          count: items.length,
          totalSize: items.reduce((sum, item) => sum + (item.size || 0), 0),
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { count: 0, totalSize: 0 };
  }
}
