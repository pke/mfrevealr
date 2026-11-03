import React from 'react';
import {createMMKV} from 'react-native-mmkv';
import CloudKeyValues from './specs/NativeCloudKeyValues';

// The figures found in each series, kept on the device and, on iOS, synced
// through iCloud's key-value store to the other devices of the same Apple
// Account. Every figure remembers when it was last ticked or unticked; the
// latest change wins, so devices that ticked different figures while apart
// end up with all of them.

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
  onChange(listener: (keys: string) => void): {remove(): void};
};

// Each series is one key, here and in iCloud.
const SERIES = 'series.';
const CURRENT = 'current';

export function mergeMarks(a: Marks, b: Marks): Marks {
  const merged = {...a};
  for (const [code, mark] of Object.entries(b)) {
    const ours = merged[code];
    if (!ours || mark.at > ours.at) {
      merged[code] = mark;
    }
  }
  return merged;
}

/** A series' marks as stored; anything malformed, from anywhere, is left out. */
function parseMarks(raw: string | undefined): Marks {
  const marks: Marks = {};
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    return marks;
  }
  if (!parsed || typeof parsed !== 'object') {
    return marks;
  }
  for (const [code, mark] of Object.entries(parsed)) {
    if (
      mark &&
      typeof mark.found === 'boolean' &&
      typeof mark.at === 'number' &&
      Number.isFinite(mark.at)
    ) {
      marks[code] = {found: mark.found, at: mark.at};
    }
  }
  return marks;
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
  // Read on demand and kept with their found figures, so an unchanged series
  // keeps the same set and nothing re-renders.
  const series = new Map<string, {marks: Marks; found: ReadonlySet<string>}>();
  const listeners = new Set<() => void>();

  const read = (setId: string) => {
    let entry = series.get(setId);
    if (!entry) {
      entry = keep(setId, parseMarks(storage.getString(SERIES + setId)));
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
  const save = (setId: string, marks: Marks, upload = true) => {
    let next = marks;
    if (upload && cloud) {
      // iCloud may have changes this device hasn't heard of yet; merged in
      // first, so no other device's ticks are written over.
      const key = SERIES + setId;
      next = mergeMarks(marks, parseMarks(cloud.get(key) ?? undefined));
      cloud.set(key, JSON.stringify(next));
    }
    keep(setId, next);
    storage.set(SERIES + setId, JSON.stringify(next));
    listeners.forEach(listener => listener());
  };

  /** Takes in what another device or an earlier sync left in iCloud. */
  const pull = (values: Record<string, string>, keys?: string[]) => {
    for (const key of keys ?? Object.keys(values)) {
      if (!key.startsWith(SERIES)) {
        continue;
      }
      const setId = key.slice(SERIES.length);
      const ours = read(setId).marks;
      const theirs = parseMarks(values[key]);
      const merged = mergeMarks(ours, theirs);
      const changed = JSON.stringify(merged) !== JSON.stringify(ours);
      // What only this device knew goes up for the others.
      const behind = JSON.stringify(merged) !== JSON.stringify(theirs);
      if (changed) {
        save(setId, merged, behind);
      } else if (behind) {
        cloud?.set(key, JSON.stringify(merged));
      }
    }
  };
  const cloudValues = (): Record<string, string> => {
    try {
      const values = JSON.parse(cloud?.getAll() ?? '{}');
      return values && typeof values === 'object' ? values : {};
    } catch {
      return {};
    }
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
    const at = now();
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
     * Merges in what iCloud has, sends up what only this device has, and
     * from then on takes in what the other devices change.
     */
    sync() {
      if (!cloud) {
        return () => {};
      }
      // Series kept on this device that iCloud doesn't know yet go up too.
      const values = cloudValues();
      for (const key of storage.getAllKeys()) {
        if (key.startsWith(SERIES) && !(key in values)) {
          values[key] = '{}';
        }
      }
      pull(values);
      const subscription = cloud.onChange(keys =>
        pull(cloudValues(), keys.split(',')),
      );
      return () => subscription.remove();
    },
  };
}

export type Collection = ReturnType<typeof createCollection>;

/** A collection in memory only, as store screenshots stage it. */
export function stagedCollection(setId: string, found: string[]): Collection {
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
