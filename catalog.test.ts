import {execFileSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {BUNDLED_REVISION, parseCatalog} from './catalog';

const valid = () => ({
  format: 1,
  revision: 202612010000,
  series: {'71045': 'Series 25'},
  sets: {
    '71045': {
      'Fierce Barbarian': [6472860, '6471959', ['024821', 'https://x.test']],
    },
  },
  images: {
    '6472860': {
      file: '6472860.webp',
      sha256: 'a'.repeat(64),
      width: 566,
      height: 824,
    },
  },
});

test('A well-formed catalog is accepted', () => {
  expect(parseCatalog(valid())).toEqual(valid());
});

test.each([
  ['an unknown format', (c: any) => (c.format = 2)],
  ['a missing revision', (c: any) => delete c.revision],
  ['a set without a series', (c: any) => (c.sets['99999'] = c.sets['71045'])],
  ['an empty set', (c: any) => (c.sets['71045'] = {})],
  ['a figure without code', (c: any) => (c.sets['71045'].X = [])],
  ['a short primary code', (c: any) => (c.sets['71045'].X = [123])],
  [
    'an image path instead of a name',
    (c: any) => (c.images['6472860'].file = '../6472860.webp'),
  ],
  [
    'an image of another figure',
    (c: any) => (c.images['6472860'].file = '6472861.webp'),
  ],
  ['a bad checksum', (c: any) => (c.images['6472860'].sha256 = 'abc')],
  ['a zero width', (c: any) => (c.images['6472860'].width = 0)],
  ['no sets at all', (c: any) => (c.sets = {})],
  ['a figure without an image', (c: any) => delete c.images['6472860']],
])('A catalog with %s is rejected', (_, spoil) => {
  const catalog = valid();
  spoil(catalog);
  expect(parseCatalog(catalog)).toBeUndefined();
});

test('Non-objects are rejected', () => {
  expect(parseCatalog(null)).toBeUndefined();
  expect(parseCatalog('catalog')).toBeUndefined();
  expect(parseCatalog([])).toBeUndefined();
});

test('The release script builds a catalog the app accepts', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-'));
  try {
    execFileSync(
      'node',
      ['scripts/catalog-release.mjs', '--out', out, '--keep-revision'],
      {cwd: __dirname, stdio: 'ignore'},
    );
    const catalog = parseCatalog(
      JSON.parse(fs.readFileSync(path.join(out, 'catalog.json'), 'utf8')),
    );
    expect(catalog?.revision).toBe(BUNDLED_REVISION);
    for (const image of Object.values(catalog!.images)) {
      expect(fs.existsSync(path.join(out, image.file))).toBe(true);
    }
  } finally {
    fs.rmSync(out, {recursive: true, force: true});
  }
});
