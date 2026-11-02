import React from 'react';
import {createMMKV, type MMKV} from 'react-native-mmkv';
import {LANGUAGES, LanguagePreference} from './languages';
import {launchLanguage, setIOSLanguage} from './languageSync';
import type {ThemePreference} from './theme';

export type Layout = 'card' | 'split' | 'strip';
export type Settings = {
  theme: ThemePreference;
  layout: Layout;
  language: LanguagePreference;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  layout: 'card',
  language: 'system',
};

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const LAYOUTS: readonly Layout[] = ['card', 'split', 'strip'];
const LANGUAGE_PREFERENCES: readonly LanguagePreference[] = [
  'system',
  ...LANGUAGES,
];

/** Reads stored settings, falling back to the default for anything unknown. */
export function parseSettings(raw: string | undefined): Settings {
  let stored: Partial<Record<keyof Settings, unknown>> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : undefined;
    if (parsed && typeof parsed === 'object') {
      stored = parsed;
    }
  } catch {}
  return {
    theme:
      THEMES.find(theme => theme === stored.theme) ?? DEFAULT_SETTINGS.theme,
    layout:
      LAYOUTS.find(layout => layout === stored.layout) ??
      DEFAULT_SETTINGS.layout,
    language:
      LANGUAGE_PREFERENCES.find(language => language === stored.language) ??
      DEFAULT_SETTINGS.language,
  };
}

const KEY = 'settings';
let storage: MMKV | undefined;
function getStorage() {
  storage ??= createMMKV({id: 'settings'});
  return storage;
}

let launched = false;

export function loadSettings(): Settings {
  const settings = parseSettings(getStorage().getString(KEY));
  if (launched) {
    return settings;
  }
  // Once per launch, before anything shows: the language may have been
  // changed in the iOS Settings app meanwhile.
  launched = true;
  const language = launchLanguage(settings.language);
  if (language === settings.language) {
    return settings;
  }
  const synced = {...settings, language};
  getStorage().set(KEY, JSON.stringify(synced));
  return synced;
}

/** Settings kept across launches; MMKV reads synchronously, so no flash. */
export function useSettings(): [Settings, (change: Partial<Settings>) => void] {
  const [settings, setSettings] = React.useState(loadSettings);
  const update = React.useCallback((change: Partial<Settings>) => {
    if (change.language) {
      setIOSLanguage(change.language);
    }
    setSettings(old => {
      const next = {...old, ...change};
      getStorage().set(KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return [settings, update];
}
