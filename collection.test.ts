import {createCollection, mergeMarks, type Cloud} from './collection';

// The app's own collection isn't used here; each test makes its own.
jest.mock('react-native-mmkv', () => ({createMMKV: jest.fn()}));

const DAY = 24 * 60 * 60;

/** Storage like MMKV's, in memory, named like a device. */
function memory(device = 'phone', values: Record<string, string> = {}) {
  values.device ??= device;
  return {
    values,
    getString: (key: string) => values[key],
    set: (key: string, value: string) => {
      values[key] = value;
    },
    getAllKeys: () => Object.keys(values),
  };
}

/** A key-value store in iCloud, shared by every device using it. */
function cloud(values: Record<string, string> = {}) {
  const devices = new Set<(keys: string) => void>();
  return {
    values,
    device(): Cloud {
      let onChange: ((keys: string) => void) | undefined;
      // iCloud tells the other devices, not the one that wrote.
      const tell = (key: string) =>
        devices.forEach(listener => listener !== onChange && listener(key));
      return {
        getAll: () => JSON.stringify(values),
        get: key => values[key] ?? null,
        set: (key, value) => {
          values[key] = value;
          tell(key);
        },
        remove: key => {
          delete values[key];
          tell(key);
        },
        onChange: listener => {
          onChange = listener;
          devices.add(listener);
          return {remove: () => devices.delete(listener)};
        },
      };
    },
  };
}

/** A clock in seconds, as the store reads it in milliseconds. */
function clock(start = 1_000_000) {
  let time = start;
  return {
    now: () => time * 1000,
    tick: (seconds = 1) => {
      time += seconds;
    },
  };
}

const found = (collection: {found(setId: string): ReadonlySet<string>}) =>
  [...collection.found('71045')].sort();

test('a found figure is kept on the device', () => {
  const storage = memory();
  createCollection({storage}).mark('71045', ['6472861'], true);
  expect(found(createCollection({storage}))).toEqual(['6472861']);
});

test('every series keeps its own figures', () => {
  const collection = createCollection({storage: memory()});
  collection.mark('71045', ['6472861'], true);
  collection.mark('71046', ['6484685'], true);
  expect([...collection.found('71045')]).toEqual(['6472861']);
  expect([...collection.found('71046')]).toEqual(['6484685']);
});

test('the current series is kept on the device', () => {
  const storage = memory();
  createCollection({storage}).setCurrent('71046');
  expect(createCollection({storage}).current()).toBe('71046');
});

test('a figure can be unticked', () => {
  const time = clock();
  const collection = createCollection({storage: memory(), now: time.now});
  collection.mark('71045', ['6472861', '6472862'], true);
  time.tick();
  collection.mark('71045', ['6472861'], false);
  expect(found(collection)).toEqual(['6472862']);
});

test('found figures keep their set while nothing changes', () => {
  const collection = createCollection({storage: memory()});
  collection.mark('71045', ['6472861'], true);
  const before = collection.found('71045');
  expect(collection.found('71045')).toBe(before);
  // Marking again what's already marked changes nothing.
  collection.mark('71045', ['6472861'], true);
  expect(collection.found('71045')).toBe(before);
});

test('listeners hear of every change', () => {
  const collection = createCollection({storage: memory()});
  const listener = jest.fn();
  const stop = collection.listen(listener);
  collection.mark('71045', ['6472861'], true);
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  collection.mark('71045', ['6472862'], true);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('the latest change of each figure wins, and found on a tie', () => {
  expect(
    mergeMarks(
      {
        a: {found: true, at: 1},
        b: {found: true, at: 5},
        d: {found: false, at: 7},
      },
      {
        a: {found: false, at: 2},
        b: {found: false, at: 3},
        c: {found: true, at: 1},
        d: {found: true, at: 7},
      },
    ),
  ).toEqual({
    a: {found: false, at: 2},
    b: {found: true, at: 5},
    c: {found: true, at: 1},
    d: {found: true, at: 7},
  });
});

test('the series started, in the order they were', () => {
  const time = clock();
  const collection = createCollection({storage: memory(), now: time.now});
  collection.mark('71046', ['6484685'], true);
  time.tick();
  collection.mark('71045', ['6472861'], true);
  time.tick();
  collection.mark('71047', ['6490000'], true);
  time.tick();
  collection.clear('71047');
  expect(collection.started()).toEqual(['71046', '71045']);
});

test('each device writes only its own key', () => {
  const shared = cloud();
  const phone = createCollection({
    storage: memory('phone'),
    cloud: shared.device(),
  });
  phone.sync();
  phone.mark('71045', ['6472861'], true);
  expect(Object.keys(shared.values)).toEqual(['s.71045.phone']);
});

test('figures found on two devices apart both count once synced', () => {
  const shared = cloud();
  const time = clock();
  const phone = createCollection({
    storage: memory('phone'),
    cloud: shared.device(),
    now: time.now,
  });
  const pad = createCollection({
    storage: memory('pad'),
    cloud: shared.device(),
    now: time.now,
  });
  // Both offline: each writes before hearing of the other.
  phone.mark('71045', ['6472861'], true);
  pad.mark('71045', ['6472862'], true);
  phone.sync();
  pad.sync();
  expect(found(phone)).toEqual(['6472861', '6472862']);
  expect(found(pad)).toEqual(['6472861', '6472862']);
});

test('a collection made offline joins the one in iCloud', () => {
  const time = clock();
  const shared = cloud({
    's.71045.pad': JSON.stringify({
      t: 1_000_000,
      f: {6472862: [1, 999_000]},
    }),
  });
  const storage = memory('phone');
  const phone = createCollection({
    storage,
    cloud: shared.device(),
    now: time.now,
  });
  phone.mark('71045', ['6472861'], true);
  phone.sync();
  expect(found(phone)).toEqual(['6472861', '6472862']);
  // Kept on this device too.
  expect(found(createCollection({storage, now: time.now}))).toEqual([
    '6472861',
    '6472862',
  ]);
});

test('starting a series over reaches the other devices', () => {
  const shared = cloud();
  const time = clock();
  const phone = createCollection({
    storage: memory('phone'),
    cloud: shared.device(),
    now: time.now,
  });
  const pad = createCollection({
    storage: memory('pad'),
    cloud: shared.device(),
    now: time.now,
  });
  phone.sync();
  pad.sync();
  phone.mark('71045', ['6472861', '6472862'], true);
  time.tick();
  pad.clear('71045');
  expect(found(phone)).toEqual([]);
});

test('anything broken in iCloud is left out', () => {
  const time = clock();
  const shared = cloud({
    's.71045.a': 'not json',
    's.71045.b': JSON.stringify({t: 1_000_000, f: {6472861: [true, 1]}}),
    's.71045.c': JSON.stringify({t: 1_000_000, f: {6472862: [1, 'x']}}),
    's.71045.d': JSON.stringify({t: 1_000_000, f: {6472863: [1, 1]}}),
    other: 'ignored',
  });
  const phone = createCollection({
    storage: memory('phone'),
    cloud: shared.device(),
    now: time.now,
  });
  phone.sync();
  expect(found(phone)).toEqual(['6472863']);
});

test('a device gone for half a year is folded in and removed', () => {
  const time = clock();
  const shared = cloud({
    's.71045.old': JSON.stringify({
      t: 1_000_000 - 200 * DAY,
      f: {6472862: [1, 1_000_000 - 210 * DAY]},
    }),
  });
  const phone = createCollection({
    storage: memory('phone'),
    cloud: shared.device(),
    now: time.now,
  });
  phone.sync();
  expect(Object.keys(shared.values)).toEqual(['s.71045.phone']);
  expect(found(phone)).toEqual(['6472862']);
});

test('a device in use keeps its key alive', () => {
  const time = clock();
  const shared = cloud();
  const storage = memory('pad');
  const pad = createCollection({
    storage,
    cloud: shared.device(),
    now: time.now,
  });
  pad.mark('71045', ['6472861'], true);
  // Months pass without a change, but the pad is opened now and then.
  for (let month = 0; month < 7; month++) {
    time.tick(30 * DAY);
    createCollection({storage, cloud: shared.device(), now: time.now}).sync();
  }
  const phone = createCollection({
    storage: memory('phone'),
    cloud: shared.device(),
    now: time.now,
  });
  phone.sync();
  expect(Object.keys(shared.values).sort()).toEqual([
    's.71045.pad',
    's.71045.phone',
  ]);
});
