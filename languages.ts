export const LANGUAGES = [
  'en',
  'de',
  'es',
  'fr',
  'it',
  'pl',
  'pt',
  'ru',
  'zh',
] as const;
export type Language = (typeof LANGUAGES)[number];
export type LanguagePreference = 'system' | Language;

/** Each language named in itself, as language pickers do. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pl: 'Polski',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
};

/** The phone's language if we have it, e.g. "zh-Hans-CN" → zh, else English. */
export function deviceLanguage(locale?: string): Language {
  let tag = locale;
  if (!tag) {
    try {
      tag = Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {}
  }
  const code = tag?.split(/[-_]/)[0].toLowerCase();
  return LANGUAGES.find(language => language === code) ?? 'en';
}

export function resolveLanguage(preference: LanguagePreference): Language {
  return preference === 'system' ? deviceLanguage() : preference;
}
