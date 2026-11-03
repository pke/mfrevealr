import React from 'react';
import {createMMKV} from 'react-native-mmkv';
import CloudKeyValues from './specs/NativeCloudKeyValues';

// The figures found in each series, kept on the device and, on iOS, synced
// through iCloud's key-value store to the other devices of the same Apple
// Account. Every figure remembers when it was last ticked or unticked; the
// latest change wins, so devices that ticked different figures while apart
// end up with all of them.
//
// In iCloud each device has its own key per series, `s.<series>.<device>`,
// holding its whole view of the series and when it was last active:
//
//   {"t": 1793660611, "f": {"6472861": [1, 1793660520]}}
//
// with times in seconds and 1 for found, 0 for unticked. Only that device
// writes its key, so devices never write over each other; each reads them
// all. A device silent for half a year is gone for good: its key, already
// merged into the others, is removed.

export type Mark = {found: boolean; at: number};
/** By figure code. */
export type Marks = Record<string, Mark>;

/** Where the collection is kept on the device; MMKV, or memory in tests. */
export type Storage = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  getAllKeys(): string[];
};

/** iCloud's key-value store, as NativeCloudKeyValues gives it. */
export type Cloud = {
  getAll(): string;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  onChange(listener: (keys: string) => void): {remove(): void};
};

// On the device: the merged marks of each series, the current series and
// this device's name in iCloud.
const SERIES = 'series.';
const CURRENT = 'current';
const DEVICE = 'device';
// In iCloud.
const CLOUD = 's.';
const DAY = 24 * 60 * 60;
// Last active longer ago than this, a device is gone.
const GONE_AFTER = 183 * DAY;

/** The latest change of each figure wins; on a tie, found does. */
export function mergeMarks(a: Marks, b: Marks): Marks {
  const merged = {...a};
  for (const [code, mark] of Object.entries(b)) {
    const ours = merged[code];
    if (
      !ours ||
      mark.at > ours.at ||
      (mark.at === ours.at && mark.found && !ours.found)
    ) {
      merged[code] = mark;
    }
  }
  return merged;
}

const sameMarks = (a: Marks, b: Marks) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(
    ([code, mark]) => b[code]?.found === mark.found && b[code]?.at === mark.at,
  );

const parseJson = (raw: string | null | undefined): unknown => {
  try {
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

/** Marks as stored, `{code: [found, at]}`; anything malformed is left out. */
function readMarks(stored: unknown): Marks {
  const marks: Marks = {};
  if (!stored || typeof stored !== 'object') {
    return marks;
  }
  for (const [code, mark] of Object.entries(stored)) {
    if (
      Array.isArray(mark) &&
      (mark[0] === 0 || mark[0] === 1) &&
      Number.isFinite(mark[1])
    ) {
      marks[code] = {found: mark[0] === 1, at: mark[1]};
    }
  }
  return marks;
}

const writeMarks = (marks: Marks) =>
  Object.fromEntries(
    Object.entries(marks).map(([code, {found, at}]) => [
      code,
      [found ? 1 : 0, at],
    ]),
  );

/** A device's key in iCloud: when it was last active and its marks. */
function readEntry(raw: string | null | undefined) {
  const stored = parseJson(raw) as {t?: unknown; f?: unknown} | undefined;
  return {
    active: Number.isFinite(stored?.t) ? (stored!.t as number) : 0,
    marks: readMarks(stored?.f),
  };
}

/** `s.<series>.<device>` taken apart, or undefined for any other key. */
function cloudKey(key: string) {
  const dot = key.lastIndexOf('.');
  if (!key.startsWith(CLOUD) || dot <= CLOUD.length) {
    return undefined;
  }
  return {setId: key.slice(CLOUD.length, dot), device: key.slice(dot + 1)};
}

const NOTHING: ReadonlySet<string> = new Set();

export function createCollection({
  storage,
  cloud,
  now = Date.now,
}: {
  storage: Storage;
  cloud?: Cloud;
  now?: () => number;
}) {
  const seconds = () => Math.floor(now() / 1000);
  let device = storage.getString(DEVICE);
  if (!device) {
    device = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
    storage.set(DEVICE, device);
  }
  const ownKey = (setId: string) => `${CLOUD}${setId}.${device}`;

  // Read on demand and kept with their found figures, so an unchanged series
  // keeps the same set and nothing re-renders.
  const series = new Map<string, {marks: Marks; found: ReadonlySet<string>}>();
  const listeners = new Set<() => void>();
  let startedSeries: string[] | undefined;

  const read = (setId: string) => {
    let entry = series.get(setId);
    if (!entry) {
      entry = keep(
        setId,
        readMarks(parseJson(storage.getString(SERIES + setId))),
      );
    }
    return entry;
  };
  const keep = (setId: string, marks: Marks) => {
    const found = new Set(
      Object.entries(marks)
        .filter(([, mark]) => mark.found)
        .map(([code]) => code),
    );
    const entry = {marks, found: found.size ? found : NOTHING};
    series.set(setId, entry);
    return entry;
  };
  const upload = (setId: string, marks: Marks) =>
    cloud?.set(
      ownKey(setId),
      JSON.stringify({t: seconds(), f: writeMarks(marks)}),
    );
  const save = (setId: string, marks: Marks) => {
    keep(setId, marks);
    storage.set(SERIES + setId, JSON.stringify(writeMarks(marks)));
    upload(setId, marks);
    startedSeries = undefined;
    listeners.forEach(listener => listener());
  };

  /**
   * Takes in every device's key of the given series, refreshes this
   * device's own when it's behind or not active of late, and removes the keys
   * of devices that are gone.
   */
  const pull = (setIds: Iterable<string>, values: Record<string, string>) => {
    const keys = Object.keys(values);
    for (const setId of new Set(setIds)) {
      const ours = read(setId).marks;
      let merged = ours;
      const gone: string[] = [];
      for (const key of keys) {
        const parsed = cloudKey(key);
        if (parsed?.setId !== setId || parsed.device === device) {
          continue;
        }
        const entry = readEntry(values[key]);
        merged = mergeMarks(merged, entry.marks);
        if (entry.active < seconds() - GONE_AFTER) {
          gone.push(key);
        }
      }
      if (!sameMarks(merged, ours)) {
        save(setId, merged);
      } else {
        const own = readEntry(values[ownKey(setId)]);
        if (!sameMarks(own.marks, merged) || own.active < seconds() - DAY) {
          upload(setId, merged);
        }
      }
      // Only once this device's key holds what theirs did.
      gone.forEach(key => cloud?.remove(key));
    }
  };
  const cloudValues = (): Record<string, string> => {
    const values = parseJson(cloud?.getAll() ?? '{}');
    return values && typeof values === 'object'
      ? (values as Record<string, string>)
      : {};
  };

  /** Ticks `codes` of a series, or unticks them. */
  const mark = (setId: string, codes: string[], found: boolean) => {
    const {marks} = read(setId);
    const changed = codes.filter(
      code => (marks[code]?.found ?? false) !== found,
    );
    if (!changed.length) {
      return;
    }
    const at = seconds();
    const next = {...marks};
    for (const code of changed) {
      next[code] = {found, at};
    }
    save(setId, next);
  };

  return {
    found(setId: string): ReadonlySet<string> {
      return setId ? read(setId).found : NOTHING;
    },
    /** The series with any figure found, in the order they were started. */
    started(): string[] {
      startedSeries ??= storage
        .getAllKeys()
        .filter(key => key.startsWith(SERIES))
        .map(key => key.slice(SERIES.length))
        .filter(setId => read(setId).found.size > 0)
        .sort(
          (a, b) =>
            Math.min(...Object.values(read(a).marks).map(m => m.at)) -
            Math.min(...Object.values(read(b).marks).map(m => m.at)),
        );
      return startedSeries;
    },
    mark,
    /** Unticks the whole series, on every device. */
    clear(setId: string) {
      mark(setId, [...read(setId).found], false);
    },
    current(): string {
      return storage.getString(CURRENT) ?? '';
    },
    setCurrent(setId: string) {
      storage.set(CURRENT, setId);
    },
    listen(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Merges in what the other devices have, sends up what only this device
     * has, and from then on takes in what they change.
     */
    sync() {
      if (!cloud) {
        return () => {};
      }
      const values = cloudValues();
      const setIds = [
        ...Object.keys(values).flatMap(key => cloudKey(key)?.setId ?? []),
        // Series kept on this device that iCloud doesn't know yet go up too.
        ...storage
          .getAllKeys()
          .filter(key => key.startsWith(SERIES))
          .map(key => key.slice(SERIES.length)),
      ];
      pull(setIds, values);
      const subscription = cloud.onChange(keys =>
        pull(
          keys.split(',').flatMap(key => cloudKey(key)?.setId ?? []),
          cloudValues(),
        ),
      );
      return () => subscription.remove();
    },
  };
}

export type Collection = ReturnType<typeof createCollection>;

/** A collection in memory only, as store screenshots stage it. */
export function stagedCollection(
  setId: string,
  found: string[],
  others: Record<string, string[]> = {},
): Collection {
  const values: Record<string, string> = {[CURRENT]: setId};
  const staged = createCollection({
    storage: {
      getString: key => values[key],
      set: (key, value) => {
        values[key] = value;
      },
      getAllKeys: () => Object.keys(values),
    },
  });
  staged.mark(setId, found, true);
  Object.entries(others).forEach(([other, codes]) =>
    staged.mark(other, codes, true),
  );
  return staged;
}

let collection: Collection | undefined;

/**
 * The app's collection, on the device and, with `synced`, in iCloud where
 * there is one.
 */
export function getCollection({synced = true} = {}): Collection {
  collection ??= createCollection({
    storage: createMMKV({id: 'collection'}),
    cloud: (synced && CloudKeyValues) || undefined,
  });
  return collection;
}

/** The figures found in a series, updated as they change on any device. */
export function useFound(target: Collection, setId: string) {
  return React.useSyncExternalStore(target.listen, () => target.found(setId));
}

/** The series with any figure found, updated as they change. */
export function useStarted(target: Collection) {
  return React.useSyncExternalStore(target.listen, target.started);
}
