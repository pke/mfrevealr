import type {CatalogProgress, UpdateResult} from './catalogStore';

/** What the scanner tells about catalog updates, if anything. */
export type CatalogNotice =
  // An unknown box: looking for a catalog that knows it.
  | {kind: 'looking'}
  // At start: a newer catalog is on its way.
  | {kind: 'updating'}
  | {kind: 'updated'}
  | {kind: 'failed'};

/**
 * When to look for a newer catalog and what to tell about it. At start the
 * check is quiet unless a newer catalog arrives. An unknown box looks again,
 * and that search shows, failures included; a box the current catalog was
 * already asked about is not looked up again.
 */
export function createCatalogUpdates({
  update,
  revision,
  progress,
  onNotice,
  noticeMs = 4000,
  minLookingMs = 1500,
}: {
  update: () => Promise<UpdateResult>;
  revision: () => number;
  progress: {
    get: () => CatalogProgress | undefined;
    subscribe: (listener: () => void) => () => void;
  };
  onNotice: (notice: CatalogNotice | undefined) => void;
  noticeMs?: number;
  /** A search that answers at once still shows this long, to be read. */
  minLookingMs?: number;
}) {
  let shown: CatalogNotice | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lookups = 0;
  // Unknown codes, with the catalog revision that didn't know them either.
  const unknown = new Map<string, number>();

  const show = (next: CatalogNotice | undefined) => {
    clearTimeout(timer);
    timer = undefined;
    shown = next;
    onNotice(next);
    if (next?.kind === 'updated' || next?.kind === 'failed') {
      timer = setTimeout(() => show(undefined), noticeMs);
    }
  };

  return {
    async atStart() {
      const unsubscribe = progress.subscribe(() => {
        if (lookups === 0 && progress.get()?.phase === 'downloading') {
          show({kind: 'updating'});
        }
      });
      try {
        const result = await update();
        if (lookups === 0) {
          if (result === 'updated') {
            show({kind: 'updated'});
          } else if (shown?.kind === 'updating') {
            show(undefined);
          }
        }
        return result;
      } finally {
        unsubscribe();
      }
    },

    /**
     * Looks for a catalog that knows `code`. With `notify: false` the banner
     * stays out of it, for a screen that shows the search itself.
     */
    async lookUp(code: string, {notify = true} = {}): Promise<UpdateResult> {
      if (unknown.get(code) === revision()) {
        return 'current';
      }
      if (notify) {
        lookups++;
        show({kind: 'looking'});
      }
      const started = Date.now();
      const result = await update();
      const remaining = minLookingMs - (Date.now() - started);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      if (result === 'current') {
        unknown.set(code, revision());
      }
      if (!notify) {
        return result;
      }
      lookups--;
      if (result === 'updated') {
        show({kind: 'updated'});
      } else if (result === 'failed') {
        show({kind: 'failed'});
      } else if (lookups === 0 && shown?.kind === 'looking') {
        show(undefined);
      }
      return result;
    },

    dispose() {
      clearTimeout(timer);
    },
  };
}
