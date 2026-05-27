import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type SupportedLocale, isValidLocale, detectSystemLocale } from '@linkchest/i18n';
import Constants from 'expo-constants';

export type { SupportedLocale } from '@linkchest/i18n';
export { isValidLocale, detectSystemLocale } from '@linkchest/i18n';

// 根据市场判断默认语言：国内版强制中文，海外版跟随系统
function getDefaultLocale(): SupportedLocale {
  const extraMarket = Constants.expoConfig?.extra?.market as string | undefined;
  const androidPackage = Constants.expoConfig?.android?.package || '';
  const isChina = extraMarket === 'china' || androidPackage === 'cn.linkchest.app';
  if (isChina) return 'zh';
  return detectSystemLocale();
}

type NestedRecord = { [key: string]: string | NestedRecord };
type TranslationMap = Record<string, string>;

function flatten(obj: NestedRecord, prefix = ''): TranslationMap {
  const result: TranslationMap = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

/** 按需加载语言文件（React Native 中使用条件 require，内存中只保留当前语言） */
function loadTranslationSync(locale: SupportedLocale): TranslationMap {
  try {
    let raw: unknown;
    switch (locale) {
      case 'zh':
        raw = require('./locales/zh.json');
        break;
      case 'en':
        raw = require('./locales/en.json');
        break;
      case 'ja':
        raw = require('./locales/ja.json');
        break;
      case 'ko':
        raw = require('./locales/ko.json');
        break;
      case 'fr':
        raw = require('./locales/fr.json');
        break;
      case 'de':
        raw = require('./locales/de.json');
        break;
      default:
        raw = require('./locales/en.json');
    }
    if (!raw || typeof raw !== 'object') {
      console.warn(`Locale ${locale} loaded invalid data, falling back to empty`);
      return {};
    }
    return flatten(raw as NestedRecord);
  } catch (err) {
    console.warn(`Failed to load locale ${locale}:`, err);
    return {};
  }
}

/** 静态缓存，供非组件场景（如 api.ts 拦截器）使用 */
const translationCache: Partial<Record<SupportedLocale, TranslationMap>> = {};

export function getCachedTranslation(locale: SupportedLocale): TranslationMap {
  if (!translationCache[locale]) {
    translationCache[locale] = loadTranslationSync(locale);
  }
  return translationCache[locale];
}

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

// 同步检测系统语言作为初始值，避免首次渲染显示 KEY
const initialLocale = getDefaultLocale();

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [currentMap, setCurrentMap] = useState<TranslationMap>(() => loadTranslationSync(initialLocale));

  useEffect(() => {
    AsyncStorage.getItem('linkchest-locale').then((saved) => {
      let target: SupportedLocale = getDefaultLocale();
      if (saved && isValidLocale(saved)) {
        target = saved;
      }
      if (target !== locale) {
        setLocaleState(target);
        setCurrentMap(loadTranslationSync(target));
      }
    });
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    setCurrentMap(loadTranslationSync(newLocale));
    AsyncStorage.setItem('linkchest-locale', newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = currentMap[key];
    // Fallback 到英文（确保已加载），再 fallback 到 key 本身
    if (value === undefined) {
      value = getCachedTranslation('en')[key] ?? key;
    }
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    return value;
  }, [currentMap]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
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
