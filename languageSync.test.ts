import {launchLanguage, setIOSLanguage} from './languageSync';

// The user mockDefaults as the native settings module keeps them.
let mockDefaults: Record<string, unknown> = {};

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
  Settings: {
    get: (key: string) => mockDefaults[key],
    set: (values: Record<string, unknown>) => Object.assign(mockDefaults, values),
  },
}));

beforeEach(() => {
  mockDefaults = {};
});

test('On the first launch the app tells iOS its language', () => {
  mockDefaults.ios_language = '';
  expect(launchLanguage('de')).toBe('de');
  expect(mockDefaults.AppleLanguages).toEqual(['de']);
  expect(mockDefaults.synced_language).toBe('de');
});

test('A language picked in the Settings app wins at the next launch', () => {
  mockDefaults = {synced_language: 'de', ios_language: 'fr-FR'};
  expect(launchLanguage('de')).toBe('fr');
  expect(mockDefaults.AppleLanguages).toEqual(['fr']);
  expect(mockDefaults.synced_language).toBe('fr');
});

test('Resetting it in the Settings app follows the phone again', () => {
  mockDefaults = {synced_language: 'de', ios_language: ''};
  expect(launchLanguage('de')).toBe('system');
  expect(mockDefaults.AppleLanguages).toBeNull();
});

test('Without a change in the Settings app the stored language stays', () => {
  mockDefaults = {synced_language: 'pl', ios_language: 'pl'};
  expect(launchLanguage('pl')).toBe('pl');
});

test('Picking a language in the app sets the iOS one', () => {
  setIOSLanguage('zh');
  expect(mockDefaults.AppleLanguages).toEqual(['zh-Hans']);
  setIOSLanguage('system');
  expect(mockDefaults.AppleLanguages).toBeNull();
  expect(mockDefaults.synced_language).toBe('system');
});
