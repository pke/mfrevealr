import {Platform, Settings} from 'react-native';
import {deviceLanguage, LanguagePreference} from './languages';

// iOS gives the app a Language row on its page in the Settings app (when the
// phone has more than one language) and keeps the choice as the app's own
// AppleLanguages. That and the in-app language picker stay one setting:
// whichever changed last wins. "synced_language" remembers what both last
// agreed on, to tell which side changed since.

const SYNCED = 'synced_language';

/** iOS code for an app language: the localizations the app ships. */
const iosCode = (language: Exclude<LanguagePreference, 'system'>) =>
  language === 'zh' ? 'zh-Hans' : language;

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
    Settings.set({
      AppleLanguages: language === 'system' ? null : [iosCode(language)],
      [SYNCED]: language,
    });
  } catch {
    // No native settings module, as in tests.
  }
}

/**
 * The language to start in. A change made in the Settings app since the
 * last launch (which relaunches the app) wins; otherwise the app's own
 * choice goes to iOS.
 */
export function launchLanguage(stored: LanguagePreference): LanguagePreference {
  if (Platform.OS !== 'ios') {
    return stored;
  }
  let language = stored;
  try {
    const synced = Settings.get(SYNCED);
    const fromIOS = iosLanguage();
    if (typeof synced === 'string' && fromIOS !== synced) {
      language = fromIOS;
    }
  } catch {
    return stored;
  }
  setIOSLanguage(language);
  return language;
}
