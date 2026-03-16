/**
 * Blueprint: Locale precedence — stored override > Telegram > profile > region > TR
 * Two supported locales: tr, en
 */
import tr from './locales/tr.json';
import en from './locales/en.json';

export type Locale = 'tr' | 'en';
export type TranslationKey = keyof typeof tr;

const bundles: Record<Locale, Record<string, string>> = { tr, en };

export function t(locale: Locale, key: string): string {
  return bundles[locale]?.[key] ?? bundles.tr[key] ?? key;
}

export function getBundle(locale: Locale): Record<string, string> {
  return bundles[locale] ?? bundles.tr;
}

export { tr, en };
