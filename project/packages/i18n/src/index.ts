export {
  AuthErrorCodes,
  CollectionErrorCodes,
  ListErrorCodes,
  TagErrorCodes,
  ShareErrorCodes,
  PublicErrorCodes,
  UploadErrorCodes,
  QuotaErrorCodes,
  StatsErrorCodes,
  SubscriptionErrorCodes,
  TierErrorCodes,
  ReferralErrorCodes,
  CommonErrorCodes,
  type AuthErrorCode,
  type CollectionErrorCode,
  type ListErrorCode,
  type TagErrorCode,
  type ShareErrorCode,
  type PublicErrorCode,
  type UploadErrorCode,
  type QuotaErrorCode,
  type StatsErrorCode,
  type SubscriptionErrorCode,
  type TierErrorCode,
  type ReferralErrorCode,
  type CommonErrorCode,
  type AllErrorCodes,
} from './errorCodes';

import zh from './locales/error.zh';
import en from './locales/error.en';
import ja from './locales/error.ja';
import ko from './locales/error.ko';
import fr from './locales/error.fr';
import de from './locales/error.de';

export const errorMessages = {
  zh,
  en,
  ja,
  ko,
  fr,
  de,
} as const;

/** 支持的所有语言 */
export type SupportedLocale = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de';

/** 支持的语言列表 */
export const ALL_LOCALES: SupportedLocale[] = ['zh', 'en', 'ja', 'ko', 'fr', 'de'];

/** 校验字符串是否为支持的语言 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return ALL_LOCALES.includes(locale as SupportedLocale);
}

/** 获取系统默认语言，未匹配则返回英文 */
export function detectSystemLocale(): SupportedLocale {
  try {
    const lang = (typeof navigator !== 'undefined' ? navigator.language : Intl.DateTimeFormat().resolvedOptions().locale) || '';
    const lower = lang.toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('ko')) return 'ko';
    if (lower.startsWith('fr')) return 'fr';
    if (lower.startsWith('de')) return 'de';
    return 'en';
  } catch {
    return 'en';
  }
}

export type SupportedErrorLocale = keyof typeof errorMessages;

export function getErrorMessage(errorCode: string, locale: string): string {
  const map = (errorMessages as Record<string, Record<string, string>>)[locale] || errorMessages.en;
  return map[errorCode] || map['ERR_UNKNOWN'] || 'An unknown error occurred';
}
