import {createHash} from 'crypto';
import {BUNDLED_REVISION} from './catalog';

// The phone's files, by path, and what the catalog release serves, by URL.
const mockFiles = new Map<string, string>();
const mockServer = new Map<string, string>();
const mockDownloads: string[] = [];

jest.mock('@dr.pogodin/react-native-fs', () => {
  const inDir = (dir: string) => (path: string) => path.startsWith(`${dir}/`);
  return {
    DocumentDirectoryPath: '/documents',
    LibraryDirectoryPath: '/library',
    exists: async (path: string) =>
      mockFiles.has(path) || [...mockFiles.keys()].some(inDir(path)),
    mkdir: async () => {},
    readFile: async (path: string) => {
      if (!mockFiles.has(path)) {
        throw new Error(`No such file ${path}`);
      }
      return mockFiles.get(path);
    },
    writeFile: async (path: string, contents: string) => {
      mockFiles.set(path, contents);
    },
    moveFile: async (from: string, to: string) => {
      mockFiles.set(to, mockFiles.get(from)!);
      mockFiles.delete(from);
    },
    unlink: async (path: string) => {
      mockFiles.delete(path);
      [...mockFiles.keys()].filter(inDir(path)).forEach(file => {
        mockFiles.delete(file);
      });
    },
    readdir: async (dir: string) =>
      [...mockFiles.keys()]
        .filter(inDir(dir))
        .map(file => file.slice(dir.length + 1))
        .filter(name => !name.includes('/')),
    hash: async (path: string) =>
      require('crypto')
        .createHash('sha256')
        .update(mockFiles.get(path) ?? '')
        .digest('hex'),
    stopDownload: () => {},
    downloadFile: ({fromUrl, toFile}: {fromUrl: string; toFile: string}) => {
      mockDownloads.push(fromUrl);
      const body = mockServer.get(fromUrl);
      if (body !== undefined) {
        mockFiles.set(toFile, body);
      }
      return {
        jobId: mockDownloads.length,
        promise: Promise.resolve({statusCode: body === undefined ? 404 : 200}),
      };
    },
  };
});
jest.mock('./figureImages', () => ({setDownloadedImages: () => {}}));

const URL = 'https://github.com/pke/mfrevealr/releases/download/catalog/';
// Jest runs as iOS: the catalog lives in Application Support.
const STORED = '/library/Application Support/catalog/catalog.json';

type Figures = Record<string, Record<string, number>>;

/** Publishes a catalog with the given series and figures, as the release does. */
function publish(revision: number, figures: Figures) {
  const images: Record<string, object> = {};
  const sets: Record<string, Record<string, number[]>> = {};
  for (const [setId, titles] of Object.entries(figures)) {
    sets[setId] = {};
    for (const [title, code] of Object.entries(titles)) {
      sets[setId][title] = [code];
      const body = `picture of ${title}`;
      mockServer.set(`${URL}${code}.webp`, body);
      images[code] = {
        file: `${code}.webp`,
        sha256: createHash('sha256').update(body).digest('hex'),
        width: 100,
        height: 150,
      };
    }
  }
  const series = Object.fromEntries(
    Object.keys(figures).map(setId => [setId, `Series ${setId}`]),
  );
  mockServer.set(
    `${URL}catalog.json`,
    JSON.stringify({format: 1, revision, series, sets, images}),
  );
}

const NEXT = BUNDLED_REVISION + 1;
const LATER = BUNDLED_REVISION + 2;
const MONSTER = {'99001': {Monster: 9900101}};

// Every test starts like a fresh launch of the app: modules load anew.
let store: typeof import('./catalogStore');
let codes: typeof import('./resolveCode');

beforeEach(() => {
  mockFiles.clear();
  mockServer.clear();
  mockDownloads.length = 0;
  jest.resetModules();
  store = require('./catalogStore');
  codes = require('./resolveCode');
  global.fetch = jest.fn(async (url: string) => {
    const body = mockServer.get(url);
    return {ok: body !== undefined, text: async () => body ?? ''};
  }) as unknown as typeof fetch;
});

/** Simulates the next launch: the app starts with what it stored before. */
async function relaunch() {
  jest.resetModules();
  store = require('./catalogStore');
  codes = require('./resolveCode');
  await store.loadStoredCatalog();
}

test('A newer catalog brings its new figures', async () => {
  publish(NEXT, MONSTER);
  expect(codes.resolveCode('9900101')).toBeUndefined();
  await expect(store.updateCatalog()).resolves.toBe('updated');
  expect(codes.resolveCode('9900101')?.title).toBe('Monster');
  expect(mockFiles.has(STORED)).toBe(true);
});

test('The catalog the app was built with is up to date', async () => {
  publish(BUNDLED_REVISION, MONSTER);
  await expect(store.updateCatalog()).resolves.toBe('current');
  expect(codes.resolveCode('9900101')).toBeUndefined();
  expect(mockDownloads).toEqual([]);
});

test('An older catalog than the app was built with is ignored', async () => {
  publish(BUNDLED_REVISION - 1, MONSTER);
  await expect(store.updateCatalog()).resolves.toBe('current');
  expect(codes.resolveCode('6472860')?.title).toBe('Fierce Barbarian');
});

test('Each newer version replaces the one before, images and all', async () => {
  publish(NEXT, MONSTER);
  await store.updateCatalog();
  publish(LATER, {'99001': {Monster: 9900101, Ghost: 9900102}});
  mockDownloads.length = 0;
  await expect(store.updateCatalog()).resolves.toBe('updated');
  expect(codes.resolveCode('9900102')?.title).toBe('Ghost');
  // The unchanged picture is kept, not downloaded again.
  expect(mockDownloads).toEqual([`${URL}9900102.webp`]);

  publish(LATER + 1, {'99002': {Robot: 9900201}});
  await store.updateCatalog();
  expect(codes.resolveCode('9900101')).toBeUndefined();
  const images = [...mockFiles.keys()].filter(file => file.includes('/images/'));
  expect(images).toHaveLength(1);
  expect(images[0]).toMatch(/-9900201\.webp$/);
});

test('A downloaded catalog is in use at the next launch', async () => {
  publish(NEXT, MONSTER);
  await store.updateCatalog();
  await relaunch();
  expect(codes.resolveCode('9900101')?.title).toBe('Monster');
  expect(store.getCatalogRevision()).toBe(NEXT);
});

test('A downloaded catalog an app update has overtaken is removed', async () => {
  publish(NEXT, MONSTER);
  await store.updateCatalog();
  // As if the app now came with a newer catalog than the downloaded one.
  mockFiles.set(
    STORED,
    mockFiles.get(STORED)!.replace(String(NEXT), String(BUNDLED_REVISION)),
  );
  await relaunch();
  expect(codes.resolveCode('9900101')).toBeUndefined();
  expect([...mockFiles.keys()]).toEqual([]);
});

test('A picture that does not match its checksum fails the update', async () => {
  publish(NEXT, MONSTER);
  mockServer.set(`${URL}9900101.webp`, 'something else');
  await expect(store.updateCatalog()).resolves.toBe('failed');
  expect(codes.resolveCode('9900101')).toBeUndefined();
  expect(mockFiles.has(STORED)).toBe(false);
});

test('A missing or broken catalog fails the update', async () => {
  await expect(store.updateCatalog()).resolves.toBe('failed');
  mockServer.set(`${URL}catalog.json`, '{"format": 1, "revision": "x"}');
  await expect(store.updateCatalog()).resolves.toBe('failed');
});

test('Progress shows the check, then each picture as it arrives', async () => {
  publish(NEXT, {'99001': {Monster: 9900101, Ghost: 9900102, Robot: 9900103}});
  const seen: unknown[] = [];
  const unsubscribe = store.onCatalogProgress(() =>
    seen.push(store.getCatalogProgress()),
  );
  await store.updateCatalog();
  unsubscribe();
  expect(seen[0]).toEqual({phase: 'checking'});
  expect(seen).toContainEqual({phase: 'downloading', done: 0, total: 3});
  expect(seen).toContainEqual({phase: 'downloading', done: 3, total: 3});
  expect(seen[seen.length - 1]).toBeUndefined();
  expect(store.getCatalogProgress()).toBeUndefined();
});

test('Progress counts only the pictures still to download', async () => {
  publish(NEXT, MONSTER);
  await store.updateCatalog();
  publish(LATER, {'99001': {Monster: 9900101, Ghost: 9900102}});
  const seen: unknown[] = [];
  store.onCatalogProgress(() => seen.push(store.getCatalogProgress()));
  await store.updateCatalog();
  expect(seen).toContainEqual({phase: 'downloading', done: 1, total: 1});
});

test('Progress ends when an update fails', async () => {
  publish(NEXT, MONSTER);
  mockServer.delete(`${URL}9900101.webp`);
  await expect(store.updateCatalog()).resolves.toBe('failed');
  expect(store.getCatalogProgress()).toBeUndefined();
});

test('A second check while one runs joins it', async () => {
  publish(NEXT, MONSTER);
  const [first, second] = await Promise.all([
    store.updateCatalog(),
    store.updateCatalog(),
  ]);
  expect([first, second]).toEqual(['updated', 'updated']);
  expect(mockDownloads).toHaveLength(1);
});
