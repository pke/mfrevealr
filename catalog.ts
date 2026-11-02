import BUNDLED from './images/sets/revision.json';
import type {Sets, Series} from './resolveCode';

/**
 * The catalog of series, figures and their images can be updated without an
 * app release: it is published as the assets of one GitHub release, with
 * catalog.json listing everything else in it.
 */
export const CATALOG_REPO = 'pke/mfrevealr';
export const CATALOG_TAG = 'catalog';
export const CATALOG_URL = `https://github.com/${CATALOG_REPO}/releases/download/${CATALOG_TAG}/`;
export const CATALOG_FORMAT = 1;

/** Revision of the catalog built into the app, as yyyyMMddHHmm in UTC. */
export const BUNDLED_REVISION: number = BUNDLED.revision;

export type CatalogImage = {
  file: string;
  sha256: string;
  width: number;
  height: number;
};

export type Catalog = {
  format: typeof CATALOG_FORMAT;
  revision: number;
  series: Series;
  sets: Sets;
  // Keyed by the figure's primary code.
  images: Record<string, CatalogImage>;
};

const CODE = /^\d{7}$/;
const SET_ID = /^\d{3,7}$/;
// Image files are flat in the release, named after the code; never a path.
const IMAGE_FILE = /^\d{7}\.(webp|png)$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_TEXT = 300;
// Far above the real catalog (10 series, 116 figures): bounds what a broken
// or tampered release can make every phone download.
const MAX_SERIES = 500;
const MAX_FIGURES = 5000;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT;

const isSize = (value: unknown) =>
  Number.isInteger(value) && (value as number) > 0 && (value as number) <= 8192;

function isFigure(codes: unknown) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return false;
  }
  const [primary, ...rest] = codes;
  return (
    CODE.test(String(primary)) &&
    rest.every(
      entry =>
        (typeof entry === 'number' && Number.isInteger(entry)) ||
        isText(entry) ||
        (Array.isArray(entry) && entry.length > 0 && entry.every(isText)),
    )
  );
}

/**
 * Accepts a downloaded catalog only if every part has the expected shape;
 * anything else, a partial upload or a tampered file, is rejected as a whole.
 */
export function parseCatalog(raw: unknown): Catalog | undefined {
  if (
    !isObject(raw) ||
    raw.format !== CATALOG_FORMAT ||
    !Number.isInteger(raw.revision) ||
    (raw.revision as number) <= 0 ||
    !isObject(raw.series) ||
    !isObject(raw.sets) ||
    !isObject(raw.images)
  ) {
    return undefined;
  }
  const {series, sets, images} = raw;
  if (
    Object.keys(series).length > MAX_SERIES ||
    Object.keys(images).length > MAX_FIGURES
  ) {
    return undefined;
  }
  const seriesOk = Object.entries(series).every(
    ([setId, name]) => SET_ID.test(setId) && isText(name),
  );
  const setsOk = Object.entries(sets).every(
    ([setId, figures]) =>
      setId in series &&
      isObject(figures) &&
      Object.keys(figures).length > 0 &&
      Object.entries(figures).every(
        ([title, codes]) =>
          isText(title) &&
          isFigure(codes) &&
          // Every figure comes with its picture.
          String((codes as unknown[])[0]) in images,
      ),
  );
  const imagesOk = Object.entries(images).every(
    ([code, image]) =>
      CODE.test(code) &&
      isObject(image) &&
      typeof image.file === 'string' &&
      IMAGE_FILE.test(image.file) &&
      image.file.startsWith(code) &&
      typeof image.sha256 === 'string' &&
      SHA256.test(image.sha256) &&
      isSize(image.width) &&
      isSize(image.height),
  );
  if (!seriesOk || !setsOk || !imagesOk || Object.keys(sets).length === 0) {
    return undefined;
  }
  return raw as Catalog;
}
