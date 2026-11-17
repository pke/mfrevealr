import fs from 'fs';
import path from 'path';
import {LANGUAGES} from '../languages';
import config from '../screenshots/config.json';

// The store listing speaks every language the app does: screenshots
// (screenshots/config.json) and texts (fastlane/metadata) for each of them.

const METADATA = path.join(__dirname, '../fastlane/metadata');
// Folders of store texts, apart from the App Review information that
// fastlane keeps beside them and the Play Store's texts (as NOT_A_LANGUAGE in
// the Fastfile).
const NOT_A_LANGUAGE = ['review_information', 'android'];
const storeLocales = fs
  .readdirSync(METADATA)
  .filter(name => fs.statSync(path.join(METADATA, name)).isDirectory())
  .filter(name => !NOT_A_LANGUAGE.includes(name))
  .sort();

// Apple's limits, in characters.
const LIMITS: Record<string, number> = {
  'name.txt': 30,
  'subtitle.txt': 30,
  'keywords.txt': 100,
  'promotional_text.txt': 170,
  'description.txt': 4000,
  'release_notes.txt': 4000,
};

test('Every app language has a store locale', () => {
  const covered = storeLocales.map(locale => locale.split('-')[0]);
  expect(covered.sort()).toEqual([...LANGUAGES].sort());
});

test('Screenshots are made for every store locale', () => {
  expect([...config.locales].sort()).toEqual(storeLocales);
});

test.each(config.scenes.map(scene => [scene.name, scene]))(
  'Scene %s has a headline in every store locale',
  (_, scene) => {
    const headline = scene.headline as Record<string, string[]>;
    for (const locale of storeLocales) {
      expect(headline[locale]?.filter(Boolean).length).toBeGreaterThan(0);
    }
  },
);

test.each(storeLocales)('%s has every store text within limits', locale => {
  // Collected per file, so a failure names the text that is missing or long.
  const problems: Record<string, number> = {};
  for (const [file, limit] of Object.entries(LIMITS)) {
    const length = [
      ...fs.readFileSync(path.join(METADATA, locale, file), 'utf8').trim(),
    ].length;
    if (length === 0 || length > limit) {
      problems[file] = length;
    }
  }
  expect(problems).toEqual({});
  for (const file of ['privacy_url.txt', 'support_url.txt']) {
    const url = fs.readFileSync(path.join(METADATA, locale, file), 'utf8');
    expect(url.trim()).toMatch(/^https:\/\//);
  }
});

// The Play Store's texts, by Play language, with Google's limits.
const PLAY = path.join(METADATA, 'android');
const PLAY_LIMITS: Record<string, number> = {
  'title.txt': 30,
  'short_description.txt': 80,
  'full_description.txt': 4000,
};
const playLocales = fs.readdirSync(PLAY).sort();
const versionCode = fs
  .readFileSync(path.join(__dirname, '../android/app/build.gradle'), 'utf8')
  .match(/versionCode (\d+)/)![1];

test('The Play Store has every store language too', () => {
  expect(playLocales).toHaveLength(storeLocales.length);
});

test.each(playLocales)('Play texts of %s are within limits', locale => {
  const read = (file: string) =>
    fs.readFileSync(path.join(PLAY, locale, file), 'utf8');
  for (const [file, limit] of Object.entries(PLAY_LIMITS)) {
    expect([...read(file)].length).toBeLessThanOrEqual(limit);
  }
  // "What's new" of the version being released.
  expect([...read(`changelogs/${versionCode}.txt`)].length).toBeLessThanOrEqual(
    500,
  );
  // Android has no iCloud.
  expect(read('full_description.txt')).not.toContain('iCloud');
});
