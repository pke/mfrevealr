import fs from 'fs';
import path from 'path';
import {LANGUAGES} from '../languages';
import config from '../screenshots/config.json';

// The store listing speaks every language the app does: screenshots
// (screenshots/config.json) and texts (fastlane/metadata) for each of them.

const METADATA = path.join(__dirname, '../fastlane/metadata');
const storeLocales = fs
  .readdirSync(METADATA)
  .filter(name => fs.statSync(path.join(METADATA, name)).isDirectory())
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
