import React from 'react';
import {Platform} from 'react-native';
import {
  DocumentDirectoryPath,
  downloadFile,
  exists,
  hash,
  LibraryDirectoryPath,
  mkdir,
  moveFile,
  readdir,
  readFile,
  stopDownload,
  unlink,
  writeFile,
} from '@dr.pogodin/react-native-fs';
import {
  BUNDLED_REVISION,
  Catalog,
  CATALOG_URL,
  CatalogImage,
  parseCatalog,
} from './catalog';
import {DownloadedImage, setDownloadedImages} from './figureImages';
import {setCatalog} from './resolveCode';

// Kept for good, like the bundled catalog: Application Support on iOS, the
// app's private files on Android. Neither is purged like a cache.
const DIR =
  Platform.OS === 'ios'
    ? `${LibraryDirectoryPath}/Application Support/catalog`
    : `${DocumentDirectoryPath}/catalog`;
const IMAGES_DIR = `${DIR}/images`;
const CATALOG_FILE = `${DIR}/catalog.json`;
const TIMEOUT = 20_000;
const PARALLEL_DOWNLOADS = 4;
// The real images are well under 200 KB and catalog.json under 100 KB; a
// release with far bigger files is broken or tampered with, so stop early.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_CATALOG_CHARS = 1024 * 1024;

// Named after the content, so an unchanged image is never downloaded twice
// and an updated one never overwrites the copy the app is showing.
const localName = (image: CatalogImage) =>
  `${image.sha256.slice(0, 16)}-${image.file}`;

let revision = BUNDLED_REVISION;
const listeners = new Set<() => void>();

function activate(catalog: Catalog) {
  const images: Record<string, DownloadedImage> = {};
  for (const [code, image] of Object.entries(catalog.images)) {
    images[code] = {
      uri: `file://${IMAGES_DIR}/${localName(image)}`,
      width: image.width,
      height: image.height,
    };
  }
  setCatalog(catalog.sets, catalog.series);
  setDownloadedImages(images);
  revision = catalog.revision;
  listeners.forEach(listener => listener());
}

/** The revision of the catalog in use. */
export function getCatalogRevision() {
  return revision;
}

/** The revision of the catalog in use; re-renders when it changes. */
export function useCatalogRevision() {
  return React.useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => revision,
  );
}

/** How far an update is: looking for a newer catalog, or downloading it. */
export type CatalogProgress =
  | {phase: 'checking'}
  | {phase: 'downloading'; done: number; total: number};

let progress: CatalogProgress | undefined;
const progressListeners = new Set<() => void>();

function report(next: CatalogProgress | undefined) {
  progress = next;
  progressListeners.forEach(listener => listener());
}

/** The running update's progress; undefined while none runs. */
export function getCatalogProgress() {
  return progress;
}

/** Calls `listener` whenever the progress changes; returns the unsubscribe. */
export function onCatalogProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

/** The running update's progress; re-renders when it changes. */
export function useCatalogProgress() {
  return React.useSyncExternalStore(onCatalogProgress, getCatalogProgress);
}

async function hasAllImages(catalog: Catalog) {
  const present = await Promise.all(
    Object.values(catalog.images).map(image =>
      exists(`${IMAGES_DIR}/${localName(image)}`),
    ),
  );
  return present.every(Boolean);
}

/**
 * Switches to the catalog downloaded earlier, if it is newer than the app's;
 * one an app update has overtaken is removed with its images.
 */
export async function loadStoredCatalog() {
  try {
    // A replacement interrupted between its two steps left only the new copy.
    const file = (await exists(CATALOG_FILE))
      ? CATALOG_FILE
      : (await exists(`${CATALOG_FILE}.part`))
      ? `${CATALOG_FILE}.part`
      : undefined;
    if (!file) {
      return;
    }
    const catalog = parseCatalog(JSON.parse(await readFile(file)));
    if (catalog && catalog.revision <= revision) {
      await unlink(DIR);
    } else if (catalog && (await hasAllImages(catalog))) {
      activate(catalog);
    }
  } catch {
    // A damaged copy is replaced by the next update.
  }
}

async function fetchCatalog() {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT);
  try {
    const response = await fetch(`${CATALOG_URL}catalog.json`, {
      signal: abort.signal,
      headers: {'Cache-Control': 'no-cache'},
    });
    if (!response.ok) {
      return undefined;
    }
    const text = await response.text();
    return text.length <= MAX_CATALOG_CHARS
      ? parseCatalog(JSON.parse(text))
      : undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(image: CatalogImage) {
  const target = `${IMAGES_DIR}/${localName(image)}`;
  const part = `${target}.part`;
  const tooBig = (bytes: number, jobId: number) => {
    if (bytes > MAX_IMAGE_BYTES) {
      stopDownload(jobId);
    }
  };
  const {promise} = downloadFile({
    fromUrl: `${CATALOG_URL}${image.file}`,
    toFile: part,
    connectionTimeout: TIMEOUT,
    readTimeout: TIMEOUT,
    begin: ({contentLength, jobId}) => tooBig(contentLength, jobId),
    // Without a Content-Length, count what arrives instead.
    progressDivider: 10,
    progress: ({bytesWritten, jobId}) => tooBig(bytesWritten, jobId),
  });
  try {
    const {statusCode} = await promise;
    if (statusCode !== 200 || (await hash(part, 'sha256')) !== image.sha256) {
      throw new Error(`Image ${image.file} failed to download`);
    }
  } catch (error) {
    await unlink(part).catch(() => {});
    throw error;
  }
  await moveFile(part, target);
}

async function replaceFile(path: string, contents: string) {
  const part = `${path}.part`;
  await writeFile(part, contents, 'utf8');
  if (await exists(path)) {
    await unlink(path);
  }
  await moveFile(part, path);
}

async function removeUnused(catalog: Catalog) {
  const used = new Set(Object.values(catalog.images).map(localName));
  const files = await readdir(IMAGES_DIR);
  await Promise.all(
    files
      .filter(file => !used.has(file))
      .map(file => unlink(`${IMAGES_DIR}/${file}`).catch(() => {})),
  );
}

export type UpdateResult = 'updated' | 'current' | 'failed';

let running: Promise<UpdateResult> | undefined;

/**
 * Downloads a newer catalog and its images, verifying every file, and only
 * then makes it the one in use and keeps it for later launches. A second call
 * while one runs joins it.
 */
export function updateCatalog(): Promise<UpdateResult> {
  running ??= update().finally(() => {
    running = undefined;
    report(undefined);
  });
  return running;
}

async function update(): Promise<UpdateResult> {
  try {
    report({phase: 'checking'});
    const catalog = await fetchCatalog();
    if (!catalog) {
      return 'failed';
    }
    if (catalog.revision <= revision) {
      return 'current';
    }
    // Downloadable again at any time, so it stays out of iCloud backups as
    // Apple's storage guidelines ask.
    await mkdir(DIR, {NSURLIsExcludedFromBackupKey: true});
    await mkdir(IMAGES_DIR, {NSURLIsExcludedFromBackupKey: true});
    // Pictures an earlier catalog brought are there already.
    const all = Object.values(catalog.images);
    const present = await Promise.all(
      all.map(image => exists(`${IMAGES_DIR}/${localName(image)}`)),
    );
    const queue = all.filter((_, index) => !present[index]);
    const total = queue.length;
    let done = 0;
    report({phase: 'downloading', done, total});
    await Promise.all(
      Array.from({length: PARALLEL_DOWNLOADS}, async () => {
        for (let image = queue.pop(); image; image = queue.pop()) {
          await downloadImage(image);
          report({phase: 'downloading', done: ++done, total});
        }
      }),
    );
    await replaceFile(CATALOG_FILE, JSON.stringify(catalog));
    activate(catalog);
    await removeUnused(catalog);
    return 'updated';
  } catch {
    return 'failed';
  }
}
