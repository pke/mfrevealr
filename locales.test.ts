import {deviceLanguage, LANGUAGE_NAMES, LANGUAGES} from './languages';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import pl from './locales/pl';
import pt from './locales/pt';
import ru from './locales/ru';
import zh from './locales/zh';

const TRANSLATIONS = {en, de, es, fr, it, pl, pt, ru, zh};

type Tree = {[key: string]: string | Tree};

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>(
    (all, [key, value]) =>
      typeof value === 'string'
        ? {...all, [prefix + key]: value}
        : {...all, ...flatten(value, `${prefix}${key}.`)},
    {},
  );
}

const placeholders = (text: string) =>
  (text.match(/{{\w+}}/g) ?? []).sort().join(',');

const english = flatten(en);

test('Every supported language has a translation and a name', () => {
  expect(Object.keys(TRANSLATIONS).sort()).toEqual([...LANGUAGES].sort());
  for (const language of LANGUAGES) {
    expect(LANGUAGE_NAMES[language]).toBeTruthy();
  }
});

test.each(LANGUAGES)('%s has every string with the same placeholders', code => {
  const strings = flatten(TRANSLATIONS[code]);
  expect(Object.keys(strings).sort()).toEqual(Object.keys(english).sort());
  for (const [key, text] of Object.entries(strings)) {
    expect(text.trim()).not.toBe('');
    expect(`${key}: ${placeholders(text)}`).toBe(
      `${key}: ${placeholders(english[key])}`,
    );
  }
});

test('The phone language maps onto a supported one', () => {
  expect(deviceLanguage('de-DE')).toBe('de');
  expect(deviceLanguage('zh-Hans-CN')).toBe('zh');
  expect(deviceLanguage('pt_BR')).toBe('pt');
  expect(deviceLanguage('ja-JP')).toBe('en');
});
