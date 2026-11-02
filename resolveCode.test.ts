import fs from 'fs';
import path from 'path';
import SETS from './images/sets/sets.json';
import {
  getConflictingCodes,
  getSetIds,
  getSetName,
  resolveCode,
  resolveScan,
} from './resolveCode';

const SET_IDS = Object.keys(SETS);

function listImages(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listImages(full) : [entry.name];
  });
}

describe('resolve code', () => {
  test('Resolve code alias', () => {
    expect(resolveCode('6471959')).toEqual(
      expect.objectContaining({
        title: 'Fierce Barbarian',
        code: '6472860',
      }),
    );
    expect(resolveCode('022048')).toEqual(
      expect.objectContaining({
        title: 'Harpy',
        code: '6472864',
      }),
    );
  });

  test('Resolve code directly', () => {
    expect(resolveCode('6472860')).toEqual(
      expect.objectContaining({
        title: 'Fierce Barbarian',
        code: '6472860',
      }),
    );
  });

  test('Resolve user codes reported without source attribution', () => {
    expect(resolveCode('005659')).toEqual(
      expect.objectContaining({title: 'Train Kid', code: '6472865'}),
    );
    expect(resolveCode('013356')).toEqual(
      expect.objectContaining({title: 'Fitness Instructor'}),
    );
    expect(resolveCode('000888')).toEqual(
      expect.objectContaining({title: 'Mushroom Sprite'}),
    );
  });

  test('Attribution URIs are not codes', () => {
    expect(
      resolveCode('https://www.reddit.com/user/lego_coffee'),
    ).toBeUndefined();
  });

  test('Unknown and empty codes do not resolve', () => {
    expect(resolveCode('')).toBeUndefined();
    expect(resolveCode(undefined)).toBeUndefined();
    expect(resolveCode('1234567')).toBeUndefined();
  });

  test('Resolve scanned data-matrix value with production data', () => {
    expect(resolveScan('6472860 2401 ABC')).toEqual(
      expect.objectContaining({title: 'Fierce Barbarian'}),
    );
    expect(resolveScan('  6472860\t2401\n')).toEqual(
      expect.objectContaining({title: 'Fierce Barbarian'}),
    );
    expect(resolveScan(undefined)).toBeUndefined();
    expect(resolveScan('')).toBeUndefined();
  });

  test('Resolve vehicle series codes', () => {
    expect(resolveCode('6538435')).toEqual(
      expect.objectContaining({
        title: 'F1 Car',
        setId: '71049',
        code: '6536851',
      }),
    );
    expect(resolveCode('6590749')).toEqual(
      expect.objectContaining({
        title: 'Bulldozer',
        setId: '42233',
        code: '6590741',
      }),
    );
  });

  test('items in set', () => {
    expect(getSetIds('71045')).toHaveLength(12);
    expect(getSetIds('71049')).toHaveLength(12);
    expect(getSetIds('42233')).toHaveLength(8);
  });

  test('no code is claimed by two figures', () => {
    expect(getConflictingCodes()).toEqual([]);
  });

  test('every set has a display name', () => {
    SET_IDS.forEach(setId => expect(getSetName(setId)).toBeTruthy());
  });

  test('every figure has a bundled image', () => {
    const images = new Set(
      listImages(path.join(__dirname, 'images/sets'))
        .map(name => name.match(/^(\d{7})\.(png|webp)$/)?.[1])
        .filter(Boolean),
    );
    SET_IDS.forEach(setId =>
      getSetIds(setId)?.forEach(code => expect(images).toContain(code)),
    );
  });

  test('all codes are 6 or 7 digits', () => {
    Object.values(SETS).forEach(figures =>
      Object.values(figures).forEach(codes =>
        (codes as (number | string | string[])[])
          .flatMap(c => (Array.isArray(c) ? c : [String(c)]))
          .filter(c => !/^https?:\/\//.test(c))
          .forEach(code => expect(code).toMatch(/^\d{6,7}$/)),
      ),
    );
  });
});
