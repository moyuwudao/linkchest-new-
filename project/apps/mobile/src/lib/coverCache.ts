import * as FileSystem from 'expo-file-system';

const COVER_CACHE_DIR = FileSystem.documentDirectory + 'covers/';
const META_FILE = FileSystem.documentDirectory + 'cover_cache_meta.json';
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5分钟冷却

interface CacheMeta {
  [url: string]: {
    fileName: string;
    size: number;
    lastAccessed: number;
  };
}

let metaCache: CacheMeta | null = null;

// 批量延迟写入：避免每次访问 lastAccessed 都写文件
let metaDirty = false;
let metaFlushTimer: ReturnType<typeof setTimeout> | null = null;
const META_FLUSH_INTERVAL = 30_000; // 30 秒批量写一次

async function flushMetaIfNeeded() {
  if (!metaDirty || !metaCache) return;
  metaDirty = false;
  try {
    await FileSystem.writeAsStringAsync(META_FILE, JSON.stringify(metaCache));
  } catch {
    console.error('Failed to flush cover cache meta');
  }
}

function scheduleMetaFlush() {
  if (metaFlushTimer) return;
  metaFlushTimer = setTimeout(async () => {
    metaFlushTimer = null;
    await flushMetaIfNeeded();
  }, META_FLUSH_INTERVAL);
}

// 应用切到后台时立即刷盘
export async function flushMetaOnBackground() {
  if (metaFlushTimer) {
    clearTimeout(metaFlushTimer);
    metaFlushTimer = null;
  }
  await flushMetaIfNeeded();
}

// 下载失败记录（内存中），避免频繁重试过期 URL
const failureLog: Map<string, number> = new Map();

function shouldSkipDownload(url: string): boolean {
  const lastFailure = failureLog.get(url);
  if (!lastFailure) return false;
  return Date.now() - lastFailure < FAILURE_COOLDOWN_MS;
}

function recordFailure(url: string): void {
  failureLog.set(url, Date.now());
}

function clearFailure(url: string): void {
  failureLog.delete(url);
}

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(COVER_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(COVER_CACHE_DIR, { intermediates: true });
  }
}

async function loadMeta(): Promise<CacheMeta> {
  if (metaCache) return metaCache;
  try {
    const content = await FileSystem.readAsStringAsync(META_FILE);
    metaCache = JSON.parse(content);
  } catch {
    metaCache = {};
  }
  return metaCache || {};
}

async function saveMeta(meta: CacheMeta, immediate = false) {
  metaCache = meta;
  metaDirty = true;
  if (immediate) {
    // 立即写盘（用于新增/删除等关键操作）
    await flushMetaIfNeeded();
  } else {
    // 延迟批量写入（用于 lastAccessed 更新等非关键操作）
    scheduleMetaFlush();
  }
}

function getCacheKey(url: string): string {
  // Simple hash for filename
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `cover_${Math.abs(hash).toString(16)}_${url.length}`;
}

export async function getCachedCoverPath(url: string): Promise<string | null> {
  if (!url) return null;
  const meta = await loadMeta();
  const key = getCacheKey(url);
  const entry = meta[url];
  if (!entry) return null;

  const filePath = COVER_CACHE_DIR + entry.fileName;
  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) {
    // File missing, clean up meta
    delete meta[url];
    await saveMeta(meta, true);
    return null;
  }

  // Update last accessed（延迟批量写入，不阻塞渲染）
  entry.lastAccessed = Date.now();
  await saveMeta(meta);
  return filePath;
}

export async function cacheCover(url: string): Promise<string | null> {
  if (!url) return null;

  // 冷却期内跳过，避免过期 URL 频繁触发无效下载
  if (shouldSkipDownload(url)) {
    return null;
  }

  await ensureCacheDir();

  // 快速路径：检查元数据中的文件是否存在（不更新 lastAccessed）
  const meta = await loadMeta();
  const entry = meta[url];
  if (entry) {
    const filePath = COVER_CACHE_DIR + entry.fileName;
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) {
      entry.lastAccessed = Date.now();
      await saveMeta(meta);
      clearFailure(url);
      return filePath;
    }
    // 文件缺失，清理元数据继续下载
    delete meta[url];
  }

  const key = getCacheKey(url);
  const fileName = `${key}.webp`;
  const filePath = COVER_CACHE_DIR + fileName;

  try {
    const downloadResult = await FileSystem.downloadAsync(url, filePath);
    if (downloadResult.status !== 200) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      recordFailure(url);
      return null;
    }

    const info = await FileSystem.getInfoAsync(filePath);
    const size = info.size || 0;

    meta[url] = {
      fileName,
      size,
      lastAccessed: Date.now(),
    };

    await saveMeta(meta, true);
    await evictIfNeeded();
    clearFailure(url);
    return filePath;
  } catch {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    recordFailure(url);
    return null;
  }
}

export async function cacheCoverFromUri(sourceUri: string, url: string): Promise<string | null> {
  if (!sourceUri || !url) return null;
  await ensureCacheDir();

  const key = getCacheKey(url);
  const fileName = `${key}.webp`;
  const filePath = COVER_CACHE_DIR + fileName;

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: filePath });
    const info = await FileSystem.getInfoAsync(filePath);
    const size = info.size || 0;

    const meta = await loadMeta();
    meta[url] = {
      fileName,
      size,
      lastAccessed: Date.now(),
    };

    await saveMeta(meta, true);
    await evictIfNeeded();
    return filePath;
  } catch {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    return null;
  }
}

async function evictIfNeeded() {
  const meta = await loadMeta();
  const entries = Object.entries(meta);
  const totalSize = entries.reduce((sum, [, v]) => sum + v.size, 0);

  if (totalSize <= MAX_CACHE_SIZE_BYTES) return;

  // Sort by lastAccessed ascending (oldest first)
  const sorted = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  let currentSize = totalSize;
  const newMeta: CacheMeta = { ...meta };

  for (const [url, entry] of sorted) {
    if (currentSize <= MAX_CACHE_SIZE_BYTES * 0.8) break;
    const filePath = COVER_CACHE_DIR + entry.fileName;
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    delete newMeta[url];
    currentSize -= entry.size;
  }

  await saveMeta(newMeta, true);
}

export async function clearCache() {
  try {
    await FileSystem.deleteAsync(COVER_CACHE_DIR, { idempotent: true });
    await FileSystem.deleteAsync(META_FILE, { idempotent: true });
    metaCache = {};
    await ensureCacheDir();
  } catch {
    console.error('Failed to clear cover cache');
  }
}

export async function getCacheSize(): Promise<number> {
  const meta = await loadMeta();
  return Object.values(meta).reduce((sum, v) => sum + v.size, 0);
}

export async function getCacheStats(): Promise<{ count: number; size: number }> {
  const meta = await loadMeta();
  const entries = Object.values(meta);
  return {
    count: entries.length,
    size: entries.reduce((sum, v) => sum + v.size, 0),
  };
}
