import {DEFAULT_SETTINGS, parseSettings} from './settings';

jest.mock('react-native-mmkv', () => ({createMMKV: jest.fn()}));

test('Missing or broken settings fall back to the defaults', () => {
  expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('')).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('"dark"')).toEqual(DEFAULT_SETTINGS);
});

test('Stored settings are read back', () => {
  expect(
    parseSettings('{"theme":"dark","layout":"strip","language":"pl"}'),
  ).toEqual({
    theme: 'dark',
    layout: 'strip',
    language: 'pl',
    codeOverlay: false,
  });
});

test('Figures on the box codes are off unless switched on', () => {
  expect(DEFAULT_SETTINGS.codeOverlay).toBe(false);
  expect(parseSettings('{"codeOverlay":true}').codeOverlay).toBe(true);
  expect(parseSettings('{"codeOverlay":"yes"}').codeOverlay).toBe(false);
});

test('Unknown values are replaced one by one', () => {
  expect(
    parseSettings('{"theme":"sepia","layout":"split","language":"de"}'),
  ).toEqual({
    theme: DEFAULT_SETTINGS.theme,
    layout: 'split',
    language: 'de',
    codeOverlay: false,
  });
  expect(
    parseSettings('{"theme":"light","layout":42,"language":"klingon"}'),
  ).toEqual({
    theme: 'light',
    layout: DEFAULT_SETTINGS.layout,
    language: DEFAULT_SETTINGS.language,
    codeOverlay: false,
  });
});
