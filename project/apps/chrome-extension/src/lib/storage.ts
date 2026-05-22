const STORAGE_KEYS = {
  TOKEN: 'linkchest_token',
  USER: 'linkchest_user',
  SERVER_URL: 'linkchest_server_url',
  QUICK_SAVE_MODE: 'linkchest_quick_save_mode',
  COVER_STRATEGY_ORDER: 'linkchest_cover_strategy_order',
  LANGUAGE: 'linkchest_language',
  DEFAULT_LIST_ID: 'linkchest_default_list_id',
  DEFAULT_TAG_IDS: 'linkchest_default_tag_ids',
  DEFAULT_NOTE: 'linkchest_default_note',
} as const;

export type QuickSaveMode = 'popup' | 'silent';
export type CoverStrategy = 'url' | 'brand' | 'ai';

const ALL_LOCALES = ['zh', 'en', 'ja', 'ko', 'fr', 'de'] as const;

/** 检测浏览器语言，未匹配则返回中文作为默认 */
export function detectSystemLocale(): string {
  try {
    const lang = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
    const lower = lang.toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('ko')) return 'ko';
    if (lower.startsWith('fr')) return 'fr';
    if (lower.startsWith('de')) return 'de';
    if (lower.startsWith('en')) return 'en';
    return 'zh';
  } catch {
    return 'zh';
  }
}

export async function getLanguage(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LANGUAGE);
  const saved = result[STORAGE_KEYS.LANGUAGE];
  if (saved && ALL_LOCALES.includes(saved)) {
    return saved;
  }
  // 未设置过语言时，检测浏览器语言并保存
  const detected = detectSystemLocale();
  await chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: detected });
  return detected;
}

export async function setLanguage(lang: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: lang });
}

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN);
  return result[STORAGE_KEYS.TOKEN] || null;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.TOKEN]: token });
}

export async function removeToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.TOKEN);
}

export async function getUser(): Promise<Record<string, unknown> | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
  const user = result[STORAGE_KEYS.USER];
  return user ? (typeof user === 'string' ? JSON.parse(user) : user) : null;
}

export async function setUser(user: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.USER]: user });
}

export async function removeUser(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.USER);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export async function logout(): Promise<void> {
  await removeToken();
  await removeUser();
}

export async function getServerUrl(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SERVER_URL);
  return result[STORAGE_KEYS.SERVER_URL] || 'https://linkchest.net';
}

export async function setServerUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SERVER_URL]: url });
}

export async function getQuickSaveMode(): Promise<QuickSaveMode> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.QUICK_SAVE_MODE);
  return result[STORAGE_KEYS.QUICK_SAVE_MODE] || 'popup';
}

export async function setQuickSaveMode(mode: QuickSaveMode): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.QUICK_SAVE_MODE]: mode });
}

export async function getCoverStrategyOrder(): Promise<CoverStrategy[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.COVER_STRATEGY_ORDER);
  return result[STORAGE_KEYS.COVER_STRATEGY_ORDER] || ['url', 'brand', 'ai'];
}

export async function setCoverStrategyOrder(order: CoverStrategy[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.COVER_STRATEGY_ORDER]: order });
}

export async function getDefaultListId(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEFAULT_LIST_ID);
  return result[STORAGE_KEYS.DEFAULT_LIST_ID] || null;
}

export async function setDefaultListId(id: string | null): Promise<void> {
  if (id === null || id === undefined || id === '') {
    await chrome.storage.local.remove(STORAGE_KEYS.DEFAULT_LIST_ID);
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.DEFAULT_LIST_ID]: id });
  }
}

export async function getDefaultTagIds(): Promise<string[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEFAULT_TAG_IDS);
  return result[STORAGE_KEYS.DEFAULT_TAG_IDS] || [];
}

export async function setDefaultTagIds(ids: string[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.DEFAULT_TAG_IDS]: ids });
}

export async function getDefaultNote(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEFAULT_NOTE);
  return result[STORAGE_KEYS.DEFAULT_NOTE] || '';
}

export async function setDefaultNote(note: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.DEFAULT_NOTE]: note });
}
