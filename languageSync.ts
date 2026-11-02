import {Platform, Settings, TurboModuleRegistry} from 'react-native';
import type {TurboModule} from 'react-native';
import {deviceLanguage, LanguagePreference} from './languages';

// iOS gives the app a Language row on its page in the Settings app (when the
// phone has more than one language) and keeps the choice as the app's own
// AppleLanguages. That and the in-app language picker stay one setting:
// whichever changed last wins. "synced_language" remembers what both last
// agreed on, to tell which side changed since.

const SYNCED = 'synced_language';

// Settings.set can't delete: a null value never reaches native. The native
// module itself can, so "System" goes through it.
interface SettingsManager extends TurboModule {
  deleteValues(keys: string[]): void;
}
const nativeSettings = () =>
  TurboModuleRegistry.get<SettingsManager>('SettingsManager');

/** iOS code for an app language: the localizations the app ships. */
const iosCode = (language: Exclude<LanguagePreference, 'system'>) =>
  language === 'zh' ? 'zh-Hans' : language;

/**
 * The phone's own first language, which "System" follows. The app's locale
 * reflects its iOS override until the next launch, so it can't tell.
 */
export function phoneLocale(): string | undefined {
  if (Platform.OS !== 'ios') {
    return undefined;
  }
  try {
    const code = Settings.get('phone_language');
    return typeof code === 'string' && code ? code : undefined;
  } catch {
    return undefined;
  }
}

/** What the Settings app is set to; the app delegate passes it on. */
function iosLanguage(): LanguagePreference {
  const code = Settings.get('ios_language');
  return typeof code === 'string' && code ? deviceLanguage(code) : 'system';
}

/** Makes the Settings app show `language`; "system" follows the phone. */
export function setIOSLanguage(language: LanguagePreference) {
  if (Platform.OS !== 'ios') {
    return;
  }
  try {
    if (language === 'system') {
      nativeSettings()?.deleteValues(['AppleLanguages']);
      Settings.set({[SYNCED]: language});
    } else {
      Settings.set({AppleLanguages: [iosCode(language)], [SYNCED]: language});
    }
  } catch {
    // No native settings module, as in tests.
  }
}

/**
 * The language to start in. A change made in the Settings app since the
 * last launch (which relaunches the app) wins; otherwise the app's own
 * choice goes to iOS. Before the first sync, a language already picked in
 * the Settings app (possible before the app had a picker) is kept.
 */
export function launchLanguage(stored: LanguagePreference): LanguagePreference {
  if (Platform.OS !== 'ios') {
    return stored;
  }
  let language = stored;
  try {
    const synced = Settings.get(SYNCED);
    const fromIOS = iosLanguage();
    const firstSync = typeof synced !== 'string';
    if (
      (firstSync && fromIOS !== 'system') ||
      (!firstSync && fromIOS !== synced)
    ) {
      language = fromIOS;
    }
  } catch {
    return stored;
  }
  setIOSLanguage(language);
  return language;
}
