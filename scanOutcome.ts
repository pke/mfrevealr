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

/**
 * Scans while a sheet may hide the camera. Codes are still recorded behind
 * it, so a box that stays in view through it never counts twice; but one that
 * came into view meanwhile counts as soon as the camera shows again.
 */
export function createScanGate(sightings: ReturnType<typeof createSightings>) {
  const unseen = new Set<string>();
  return {
    scan(
      values: (string | undefined)[],
      {hidden, deliberate = false}: {hidden: boolean; deliberate?: boolean},
    ): ScanOutcome | undefined {
      const outcome = classifyScan(values, sightings, deliberate);
      if (!hidden) {
        return outcome;
      }
      if (outcome?.kind === 'figures') {
        outcome.entries.forEach(entry => unseen.add(entry.code));
      } else if (outcome?.kind === 'unknown') {
        unseen.add(scannedCode(outcome.value)!);
      }
      return undefined;
    },
    /** The camera shows again: what came into view behind it counts. */
    show() {
      unseen.forEach(code => sightings.forget(code));
      unseen.clear();
    },
  };
}
