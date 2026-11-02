import {resolveCode, resolveScan, scannedCode} from './resolveCode';
import type {createSightings} from './sightings';

type Entry = NonNullable<ReturnType<typeof resolveScan>>;

export type ScanOutcome =
  // Boxes the catalog knows: reveal their figures, every one new in view.
  | {kind: 'figures'; entries: Entry[]}
  // A box the catalog lacks: a newer catalog may know it.
  | {kind: 'unknown'; value: string}
  // A code that is no box, from any other product.
  | {kind: 'ignored'};

/**
 * What a camera frame's codes mean, or undefined when nothing in it is new.
 * Every code is recorded in `sightings`, so one that stays in view counts
 * only once and two in view don't take turns; `deliberate` scans (codes held
 * up on purpose, by the test camera) count every time.
 */
export function classifyScan(
  values: (string | undefined)[],
  sightings: ReturnType<typeof createSightings>,
  deliberate = false,
): ScanOutcome | undefined {
  const read = values
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));
  const known: Entry[] = [];
  const unknown: string[] = [];
  const other: string[] = [];
  for (const value of read) {
    const code = scannedCode(value);
    const entry = code && resolveCode(code);
    const key = code ?? value;
    if (!sightings.see(key) && !deliberate) {
      continue;
    }
    if (entry) {
      known.push(entry);
    } else if (code) {
      unknown.push(value);
    } else {
      other.push(value);
    }
  }
  if (known.length) {
    return {kind: 'figures', entries: known};
  }
  if (unknown.length) {
    return {kind: 'unknown', value: unknown[0]};
  }
  return other.length ? {kind: 'ignored'} : undefined;
}
