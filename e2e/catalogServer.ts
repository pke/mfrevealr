import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// Serves catalog updates to end-to-end test builds, which look for them here
// instead of on GitHub (e2e/app/catalogSource.ts). The release itself is
// built from the repo by scripts/catalog-release.mjs, the way it is published.

const E2E = JSON.parse(fs.readFileSync('e2e/catalog.json', 'utf8')) as {
  port: number;
  bundledRevision: number;
  missingSeries: string;
};
const OUT = 'build/e2e-catalog';

/** A series no real catalog has, for a second update after the newest one. */
export const NEXT_FIGURE = {code: '9999901', title: 'Test Pilot'};
export const NEXT_REVISION = 202612010000;

export type CatalogVersion =
  // Whatever the app came with: nothing to update.
  | 'bundled'
  // The published catalog, with the series the test build lacks.
  | 'latest'
  // The published one and one more series.
  | 'next'
  // The published catalog, but every picture is corrupt.
  | 'broken'
  // Nothing answers.
  | 'offline';

type Catalog = {
  revision: number;
  series: Record<string, string>;
  sets: Record<string, Record<string, unknown[]>>;
  images: Record<string, {file: string; sha256: string}>;
};

function published(): {catalog: Catalog; files: Map<string, Buffer>} {
  execFileSync(
    'node',
    ['scripts/catalog-release.mjs', '--keep-revision', '--out', OUT],
    {stdio: 'ignore'},
  );
  const catalog = JSON.parse(
    fs.readFileSync(path.join(OUT, 'catalog.json'), 'utf8'),
  ) as Catalog;
  const files = new Map(
    Object.values(catalog.images).map(image => [
      image.file,
      fs.readFileSync(path.join(OUT, image.file)),
    ]),
  );
  return {catalog, files};
}

function versions() {
  const {catalog: latest, files} = published();

  const missing = new Set(
    Object.values(latest.sets[E2E.missingSeries]).map(codes =>
      String(codes[0]),
    ),
  );
  const bundled: Catalog = {
    ...latest,
    revision: E2E.bundledRevision,
    series: {...latest.series},
    sets: {...latest.sets},
    images: Object.fromEntries(
      Object.entries(latest.images).filter(([code]) => !missing.has(code)),
    ),
  };
  delete bundled.series[E2E.missingSeries];
  delete bundled.sets[E2E.missingSeries];

  // Any real picture will do for the made-up figure.
  const picture = files.values().next().value!;
  const file = `${NEXT_FIGURE.code}.webp`;
  files.set(file, picture);
  const next: Catalog = {
    ...latest,
    revision: NEXT_REVISION,
    series: {...latest.series, '99999': 'Test Series'},
    sets: {
      ...latest.sets,
      '99999': {[NEXT_FIGURE.title]: [Number(NEXT_FIGURE.code)]},
    },
    images: {
      ...latest.images,
      [NEXT_FIGURE.code]: {
        ...Object.values(latest.images)[0],
        file,
        sha256: createHash('sha256')
          .update(new Uint8Array(picture))
          .digest('hex'),
      },
    },
  };
  return {catalogs: {bundled, latest, next, broken: latest}, files};
}

export async function startCatalogServer() {
  const {catalogs, files} = versions();
  let version: CatalogVersion = 'bundled';
  let delayMs = 0;
  const server = http.createServer((request, response) => {
    const name = decodeURIComponent((request.url ?? '/').slice(1));
    if (version === 'offline') {
      response.writeHead(503).end();
      return;
    }
    if (name === 'catalog.json') {
      response
        .writeHead(200, {'Content-Type': 'application/json'})
        .end(JSON.stringify(catalogs[version]));
      return;
    }
    const body = files.get(name);
    if (!body) {
      response.writeHead(404).end();
      return;
    }
    // Slow enough pictures let tests watch the progress.
    setTimeout(() => {
      response
        .writeHead(200, {'Content-Type': 'image/webp'})
        .end(version === 'broken' ? Buffer.from('corrupt') : body);
    }, delayMs);
  });
  // Never what keeps the test run from ending.
  server.unref();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(E2E.port, resolve);
  });
  return {
    /** What the server answers from now on; `delay` slows each picture. */
    serve(next: CatalogVersion, options: {delay?: number} = {}) {
      version = next;
      delayMs = options.delay ?? 0;
    },
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}

export type CatalogServer = Awaited<ReturnType<typeof startCatalogServer>>;
