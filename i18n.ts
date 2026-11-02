import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';
import {Language, resolveLanguage} from './languages';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import pl from './locales/pl';
import pt from './locales/pt';
import ru from './locales/ru';
import zh from './locales/zh';
import {loadSettings} from './settings';

export const TRANSLATIONS = {en, de, es, fr, it, pl, pt, ru, zh};

// Bundled strings, so starting synchronously in the stored language means
// the first frame is already translated.
i18next.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(TRANSLATIONS).map(([language, translation]) => [
      language,
      {translation},
    ]),
  ) as Record<Language, {translation: typeof en}>,
  lng: resolveLanguage(loadSettings().language),
  fallbackLng: 'en',
  initAsync: false,
  // React Native renders text, not HTML; nothing to escape.
  interpolation: {escapeValue: false},
});

export default i18next;
