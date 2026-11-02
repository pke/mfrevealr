import {BUNDLED} from './catalogSource';

type Entry = {
  setId: string;
  title: string;
  code: string;
  alias?: string;
  sourceUri?: string;
  authorUri?: string;
};

// A figure is listed as [primaryCode, ...aliasCodes, ...attributions] where an
// attribution is [...codes, sourceUri?, authorUri?] reported by a user.
export type CodeOrAttribution = number | string | string[];
export type Sets = Record<string, Record<string, CodeOrAttribution[]>>;
export type Series = Record<string, string>;

const BY_CODE = new Map<string, Entry>();
const BY_SET = new Map<string, string[]>();
const CONFLICTS: string[] = [];

function isUri(value: string) {
  return /^https?:\/\//i.test(value);
}

const AMBIGUOUS = new Set<string>();
let SERIES: Series = BUNDLED.series;

function register(code: string, entry: Entry) {
  if (AMBIGUOUS.has(code)) {
    return;
  }
  const existing = BY_CODE.get(code);
  if (existing && existing.code !== entry.code) {
    CONFLICTS.push(
      `${code}: "${existing.title}" (${existing.setId}) vs "${entry.title}" (${entry.setId})`,
    );
    // Ambiguous codes must not reveal a (possibly wrong) figure.
    AMBIGUOUS.add(code);
    BY_CODE.delete(code);
    return;
  }
  if (!existing) {
    BY_CODE.set(code, entry);
  }
}

/**
 * Makes `sets` and `series` the catalog every lookup uses: the bundled one at
 * start, a downloaded one once it has been verified.
 */
export function setCatalog(sets: Sets, series: Series) {
  BY_CODE.clear();
  BY_SET.clear();
  CONFLICTS.length = 0;
  AMBIGUOUS.clear();
  SERIES = series;
  Object.entries(sets).forEach(([setId, items]) => {
    Object.entries(items).forEach(([title, codes]) => {
      const primaryCode = String(codes[0]);
      const setItems = BY_SET.get(setId) || [];
      setItems.push(primaryCode);
      BY_SET.set(setId, setItems);

      codes.forEach(codeOrCodes => {
        if (Array.isArray(codeOrCodes)) {
          const uris = codeOrCodes.filter(isUri);
          const [sourceUri, authorUri] = uris;
          codeOrCodes
            .filter(value => !isUri(value))
            .forEach(alias =>
              register(alias.trim(), {
                setId,
                title,
                alias,
                code: primaryCode,
                sourceUri,
                authorUri,
              }),
            );
        } else {
          const code = String(codeOrCodes);
          register(code, {setId, title, alias: code, code: primaryCode});
        }
      });
    });
  });
}

setCatalog(BUNDLED.sets, BUNDLED.series);

/** Codes that are claimed by more than one figure and therefore never resolve. */
export function getConflictingCodes() {
  return CONFLICTS;
}

export function resolveCode(code: string | undefined) {
  if (!code) {
    return undefined;
  }
  return BY_CODE.get(code.trim());
}

/**
 * Resolves the raw value of a scanned box data-matrix, which is the figure
 * code followed by production data separated by whitespace.
 */
export function resolveScan(value: string | undefined) {
  const [figCode] = value?.trim().split(/\s+/) || [];
  return resolveCode(figCode);
}

/**
 * The figure code of a scanned box, known or not: 7 digits before the batch
 * data. Other data matrices, from any other product, have none.
 */
export function scannedCode(value: string | undefined) {
  const [figCode] = value?.trim().split(/\s+/) || [];
  return figCode && /^\d{7}$/.test(figCode) ? figCode : undefined;
}

export function getSetIds(setId: string) {
  return BY_SET.get(setId);
}

export function getSetName(setId: string): string | undefined {
  return SERIES[setId];
}

export function getFigureTitle(code: string) {
  return BY_CODE.get(code)?.title;
}
