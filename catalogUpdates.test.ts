import type {CatalogProgress, UpdateResult} from './catalogStore';
import {CatalogNotice, createCatalogUpdates} from './catalogUpdates';

jest.mock('./catalogStore', () => ({}));

/** A stand-in for the catalog download that the test finishes by hand. */
function fakeCatalog() {
  let revision = 1;
  let progress: CatalogProgress | undefined;
  const listeners = new Set<() => void>();
  let finish: ((result: UpdateResult) => void) | undefined;
  let running: Promise<UpdateResult> | undefined;
  const report = (next: CatalogProgress | undefined) => {
    progress = next;
    listeners.forEach(listener => listener());
  };
  return {
    calls: 0,
    update() {
      this.calls++;
      running ??= new Promise<UpdateResult>(resolve => {
        report({phase: 'checking'});
        finish = result => {
          running = undefined;
          if (result === 'updated') {
            revision++;
          }
          report(undefined);
          resolve(result);
        };
      });
      return running;
    },
    download: (done: number, total: number) =>
      report({phase: 'downloading', done, total}),
    finish: async (result: UpdateResult) => {
      finish!(result);
      await Promise.resolve();
    },
    revision: () => revision,
    progress: {
      get: () => progress,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
}

let catalog: ReturnType<typeof fakeCatalog>;
let notices: (CatalogNotice | undefined)[];
let updates: ReturnType<typeof createCatalogUpdates>;
const notice = () => notices[notices.length - 1];

beforeEach(() => {
  jest.useFakeTimers();
  catalog = fakeCatalog();
  notices = [];
  updates = createCatalogUpdates({
    update: () => catalog.update(),
    revision: catalog.revision,
    progress: catalog.progress,
    onNotice: next => notices.push(next),
    noticeMs: 4000,
    // Most tests look at what shows, not for how long.
    minLookingMs: 0,
  });
});

afterEach(() => {
  updates.dispose();
  jest.useRealTimers();
});

describe('At app start', () => {
  test('nothing shows while it checks, nor when the catalog is current', async () => {
    const start = updates.atStart();
    expect(notice()).toBeUndefined();
    await catalog.finish('current');
    await start;
    expect(notices).toEqual([]);
  });

  test('a failed check stays quiet', async () => {
    const start = updates.atStart();
    await catalog.finish('failed');
    await start;
    expect(notices).toEqual([]);
  });

  test('a newer catalog shows its download, then that it arrived', async () => {
    const start = updates.atStart();
    catalog.download(0, 12);
    expect(notice()).toEqual({kind: 'updating'});
    await catalog.finish('updated');
    await start;
    expect(notice()).toEqual({kind: 'updated'});
    jest.advanceTimersByTime(4000);
    expect(notice()).toBeUndefined();
  });

  test('a download that fails disappears quietly', async () => {
    const start = updates.atStart();
    catalog.download(3, 12);
    await catalog.finish('failed');
    await start;
    expect(notice()).toBeUndefined();
  });
});

describe('An unknown box', () => {
  test('shows the search, then the old behaviour when nothing is newer', async () => {
    const found = updates.lookUp('9900101');
    expect(notice()).toEqual({kind: 'looking'});
    await catalog.finish('current');
    await expect(found).resolves.toBe('current');
    expect(notice()).toBeUndefined();
  });

  test('reports a newer catalog, so the box can be shown', async () => {
    const found = updates.lookUp('9900101');
    catalog.download(5, 12);
    expect(notice()).toEqual({kind: 'looking'});
    await catalog.finish('updated');
    await expect(found).resolves.toBe('updated');
    expect(notice()).toEqual({kind: 'updated'});
  });

  test('shows when the update failed', async () => {
    const found = updates.lookUp('9900101');
    await catalog.finish('failed');
    await expect(found).resolves.toBe('failed');
    expect(notice()).toEqual({kind: 'failed'});
    jest.advanceTimersByTime(4000);
    expect(notice()).toBeUndefined();
  });

  test('is looked up once per catalog', async () => {
    const first = updates.lookUp('9900101');
    await catalog.finish('current');
    await first;
    notices = [];
    await expect(updates.lookUp('9900101')).resolves.toBe('current');
    expect(catalog.calls).toBe(1);
    expect(notices).toEqual([]);
  });

  test('is tried again after a failure', async () => {
    const first = updates.lookUp('9900101');
    await catalog.finish('failed');
    await first;
    const second = updates.lookUp('9900101');
    expect(catalog.calls).toBe(2);
    await catalog.finish('updated');
    await expect(second).resolves.toBe('updated');
  });

  test('is looked up again once a newer catalog arrived', async () => {
    const first = updates.lookUp('9900101');
    await catalog.finish('current');
    await first;
    const other = updates.lookUp('9900202');
    await catalog.finish('updated');
    await other;
    updates.lookUp('9900101');
    expect(catalog.calls).toBe(3);
  });

  test('during the start check shows its search and its errors', async () => {
    const start = updates.atStart();
    const found = updates.lookUp('9900101');
    expect(catalog.calls).toBe(2);
    expect(notice()).toEqual({kind: 'looking'});
    catalog.download(1, 12);
    expect(notice()).toEqual({kind: 'looking'});
    await catalog.finish('failed');
    await Promise.all([start, found]);
    expect(notice()).toEqual({kind: 'failed'});
  });

  test('keeps its search on screen long enough to be read', async () => {
    updates.dispose();
    updates = createCatalogUpdates({
      update: () => catalog.update(),
      revision: catalog.revision,
      progress: catalog.progress,
      onNotice: next => notices.push(next),
      minLookingMs: 1500,
    });
    let settled = false;
    const found = updates.lookUp('9900101').then(result => {
      settled = true;
      return result;
    });
    jest.advanceTimersByTime(200);
    await catalog.finish('current');
    expect(notice()).toEqual({kind: 'looking'});
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1300);
    await expect(found).resolves.toBe('current');
    expect(notice()).toBeUndefined();
  });

  test('can stay off the banner, for a card that shows it instead', async () => {
    const start = updates.atStart();
    const found = updates.lookUp('9900101', {notify: false});
    catalog.download(1, 12);
    await catalog.finish('failed');
    await expect(found).resolves.toBe('failed');
    await start;
    // Only what the start check shows of its own download.
    expect(notices).toEqual([{kind: 'updating'}, undefined]);
  });

  test('a quiet one still lets the start check announce a new catalog', async () => {
    const start = updates.atStart();
    const found = updates.lookUp('9900101', {notify: false});
    catalog.download(1, 12);
    expect(notice()).toEqual({kind: 'updating'});
    await catalog.finish('updated');
    await Promise.all([start, found]);
    expect(notice()).toEqual({kind: 'updated'});
  });
});
