import {createCollection, mergeMarks, type Cloud} from './collection';

// The app's own collection isn't used here; each test makes its own.
jest.mock('react-native-mmkv', () => ({createMMKV: jest.fn()}));

/** Storage like MMKV's, in memory. */
function memory(values: Record<string, string> = {}) {
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
      return {
        getAll: () => JSON.stringify(values),
        get: key => values[key] ?? null,
        set: (key, value) => {
          values[key] = value;
          // iCloud tells the other devices, not the one that wrote.
          devices.forEach(listener => listener !== onChange && listener(key));
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

test('a found figure is kept on the device', () => {
  const storage = memory();
  createCollection({storage, now: () => 1}).mark('71045', ['6472861'], true);
  const again = createCollection({storage, now: () => 2});
  expect([...again.found('71045')]).toEqual(['6472861']);
});

test('every series keeps its own figures', () => {
  const collection = createCollection({storage: memory(), now: () => 1});
  collection.mark('71045', ['6472861'], true);
  collection.mark('71046', ['6484685'], true);
  expect([...collection.found('71045')]).toEqual(['6472861']);
  expect([...collection.found('71046')]).toEqual(['6484685']);
});

test('the current series is kept on the device', () => {
  const storage = memory();
  createCollection({storage, now: () => 1}).setCurrent('71046');
  expect(createCollection({storage, now: () => 2}).current()).toBe('71046');
});

test('a figure can be unticked', () => {
  let time = 1;
  const collection = createCollection({storage: memory(), now: () => time++});
  collection.mark('71045', ['6472861', '6472862'], true);
  collection.mark('71045', ['6472861'], false);
  expect([...collection.found('71045')]).toEqual(['6472862']);
});

test('found figures keep their set while nothing changes', () => {
  const collection = createCollection({storage: memory(), now: () => 1});
  collection.mark('71045', ['6472861'], true);
  const found = collection.found('71045');
  expect(collection.found('71045')).toBe(found);
  // Marking again what's already marked changes nothing.
  collection.mark('71045', ['6472861'], true);
  expect(collection.found('71045')).toBe(found);
});

test('listeners hear of every change', () => {
  const collection = createCollection({storage: memory(), now: () => 1});
  const listener = jest.fn();
  const stop = collection.listen(listener);
  collection.mark('71045', ['6472861'], true);
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  collection.mark('71045', ['6472862'], true);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('the latest change of each figure wins', () => {
  expect(
    mergeMarks(
      {a: {found: true, at: 1}, b: {found: true, at: 5}},
      {
        a: {found: false, at: 2},
        b: {found: false, at: 3},
        c: {found: true, at: 1},
      },
    ),
  ).toEqual({
    a: {found: false, at: 2},
    b: {found: true, at: 5},
    c: {found: true, at: 1},
  });
});

test('figures found on two devices apart both count once synced', () => {
  const shared = cloud();
  const phone = createCollection({
    storage: memory(),
    cloud: shared.device(),
    now: () => 1,
  });
  const pad = createCollection({
    storage: memory(),
    cloud: shared.device(),
    now: () => 2,
  });
  phone.sync();
  pad.sync();
  phone.mark('71045', ['6472861'], true);
  pad.mark('71045', ['6472862'], true);
  expect([...phone.found('71045')].sort()).toEqual(['6472861', '6472862']);
  expect([...pad.found('71045')].sort()).toEqual(['6472861', '6472862']);
});

test('a collection made offline joins the one in iCloud', () => {
  const shared = cloud({
    'series.71045': JSON.stringify({6472862: {found: true, at: 5}}),
  });
  const storage = memory();
  const phone = createCollection({
    storage,
    cloud: shared.device(),
    now: () => 1,
  });
  phone.mark('71045', ['6472861'], true);
  phone.sync();
  expect([...phone.found('71045')].sort()).toEqual(['6472861', '6472862']);
  // Both are sent up for the other devices, and kept on this one.
  expect(Object.keys(JSON.parse(shared.values['series.71045'])).sort()).toEqual(
    ['6472861', '6472862'],
  );
  expect(
    [...createCollection({storage, now: () => 2}).found('71045')].sort(),
  ).toEqual(['6472861', '6472862']);
});

test('starting a series over reaches the other devices', () => {
  const shared = cloud();
  let time = 1;
  const now = () => time++;
  const phone = createCollection({
    storage: memory(),
    cloud: shared.device(),
    now,
  });
  const pad = createCollection({
    storage: memory(),
    cloud: shared.device(),
    now,
  });
  phone.sync();
  pad.sync();
  phone.mark('71045', ['6472861', '6472862'], true);
  pad.clear('71045');
  expect([...phone.found('71045')]).toEqual([]);
});

test('a broken value in iCloud is left out', () => {
  const shared = cloud({
    'series.71045': 'not json',
    'series.71046': JSON.stringify({6484685: {found: 'yes', at: 1}}),
    'series.71047': JSON.stringify({6490000: {found: true, at: 1}}),
    other: 'ignored',
  });
  const phone = createCollection({
    storage: memory(),
    cloud: shared.device(),
    now: () => 2,
  });
  phone.sync();
  expect([...phone.found('71045')]).toEqual([]);
  expect([...phone.found('71046')]).toEqual([]);
  expect([...phone.found('71047')]).toEqual(['6490000']);
});
