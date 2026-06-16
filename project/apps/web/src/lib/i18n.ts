'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { type SupportedLocale, isValidLocale, detectSystemLocale } from '@linkchest/i18n';

export type { SupportedLocale } from '@linkchest/i18n';

// 重新导出共享工具
export { isValidLocale, detectSystemLocale } from '@linkchest/i18n';

type NestedRecord = { [key: string]: string | NestedRecord };
type TranslationMap = Record<string, string>;

function flatten(obj: NestedRecord, prefix = ''): TranslationMap {
  const result: TranslationMap = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

/** 同步加载语言文件，避免首屏闪烁 */
function loadTranslationSync(locale: SupportedLocale): TranslationMap {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(`./locales/${locale}.json`);
  return flatten(module as NestedRecord);
}

/** 按需动态加载语言文件 */
async function loadTranslation(locale: SupportedLocale): Promise<TranslationMap> {
  const module = await import(`./locales/${locale}.json`);
  return flatten(module.default as NestedRecord);
}

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
  isLoading: true,
});

function getInitialLocale(): SupportedLocale {
  // 优先从 cookie 读取（SSR/CSR 都能访问，避免 hydration 闪烁）
  if (typeof document !== 'undefined') {
    const cookieLocale = getCookieLocale();
    if (cookieLocale) return cookieLocale;
  }

  if (typeof window === 'undefined') {
    // SSR 阶段：服务端没有 window.document，但也没有同步访问 cookie 的接口
    // 服务端返回 'en' 作为占位，客户端 hydration 时会立即校正为正确语言
    // 校正发生在 useState 初始值求值时（同步），不会引发 hydration mismatch 警告
    return 'en';
  }

  // 客户端：优先用 document.cookie（在 useState 初始化时已检查过）
  // 其次根据域名判断
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'linkchest.cn' || hostname.endsWith('.linkchest.cn')) {
    return 'zh';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && isValidLocale(urlLang)) {
    return urlLang;
  }

  const saved = localStorage.getItem('linkchest-locale');
  if (saved && isValidLocale(saved)) {
    return saved;
  }

  return detectSystemLocale();
}

/** 从 cookie 读取语言（避免 SSR/CSR hydration 不一致） */
function getCookieLocale(): SupportedLocale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)linkchest-locale=([^;]+)/);
  if (match) {
    const v = decodeURIComponent(match[1]);
    if (isValidLocale(v)) return v;
  }
  return null;
}

export function I18nProvider({ children, initialLocale: serverLocale }: { children: ReactNode; initialLocale?: SupportedLocale }) {
  // 优先使用服务端传入的语言（解决 SSR/CSR hydration 不一致）
  // 其次回退到客户端同步检测
  const initialLocale = useMemo(() => {
    if (serverLocale) return serverLocale;
    return getInitialLocale();
  }, [serverLocale]);
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  // 同步预加载初始语言和英文 fallback，彻底消除首屏 key 闪烁
  const [translations, setTranslations] = useState<Record<SupportedLocale, TranslationMap | null>>(() => {
    try {
      const en = loadTranslationSync('en');
      const target = loadTranslationSync(initialLocale);
      return { zh: null, en, ja: null, ko: null, fr: null, de: null, [initialLocale]: target };
    } catch {
      return { zh: null, en: null, ja: null, ko: null, fr: null, de: null };
    }
  });

  // 初始加载：仅用于设置 document.lang 和持久化，翻译已在 useState 中同步加载
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('linkchest-locale', locale);
    // 同时写 cookie（1 年），让服务端 SSR 时也能读到正确语言
    document.cookie = `linkchest-locale=${locale}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  }, [locale]);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;

    // 如果该语言尚未加载，先动态加载
    if (!translations[newLocale]) {
      const loaded = await loadTranslation(newLocale);
      setTranslations(prev => ({ ...prev, [newLocale]: loaded }));
    }

    setLocaleState(newLocale);
    localStorage.setItem('linkchest-locale', newLocale);
    document.cookie = `linkchest-locale=${newLocale}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
    document.documentElement.lang = newLocale;
  }, [locale, translations]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translationMap = translations[locale];
    let value = translationMap?.[key] ?? translations.en?.[key] ?? key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    return value;
  }, [locale, translations]);

  const isLoading = !translations[locale];

  const contextValue = useMemo(() => ({ locale, setLocale, t, isLoading }), [locale, setLocale, t, isLoading]);

  return React.createElement(I18nContext.Provider, { value: contextValue }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}

// 默认分组在数据库中的特殊 name 值
const DEFAULT_LIST_KEYS = ['__DEFAULT_LIST__', '我的收藏'];

// Helper function to get the display name for a list
// When isDefault is true or name matches a default list key, returns the translated default group name
export function getListDisplayName(list: { name: string; isDefault?: boolean }, t: (key: string) => string): string {
  if (list.isDefault || DEFAULT_LIST_KEYS.includes(list.name)) {
    return t('group.defaultName');
  }
  return list.name;
}

// Helper function to get the full path display name for a list
// Shows: 1级/2级/3级 format, with proper i18n for default group names
export function getListPathDisplayName(
  list: { name: string; isDefault?: boolean; path?: { id: string; name: string; isDefault?: boolean }[]; pathName?: string | null; depth?: number },
  t: (key: string) => string
): string {
  const displayName = getListDisplayName(list, t)
  // 如果是1级分组，只显示名称
  if (!list.path || list.path.length === 0 || list.depth === 0) {
    return displayName
  }
  // 构建路径：对路径中每个分组名也做 i18n 处理
  const pathNames = list.path.map(p => {
    if (p.isDefault || DEFAULT_LIST_KEYS.includes(p.name)) {
      return t('group.defaultName')
    }
    return p.name
  })
  return pathNames.join(' / ') + ' / ' + displayName
}

export { I18nContext };
