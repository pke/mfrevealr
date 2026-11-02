#!/usr/bin/env node
// Builds the catalog the app downloads from the GitHub release "catalog":
// catalog.json (series, figures, image checksums and sizes) plus one image per
// figure, named after its primary code.
//
//   node scripts/catalog-release.mjs              # build into dist/catalog
//   node scripts/catalog-release.mjs --publish    # build and upload with gh
//
// --out <dir>        build somewhere else
// --keep-revision    reuse images/sets/revision.json instead of a new one
//
// A new revision is also written to images/sets/revision.json, so the next app
// build knows its bundled catalog is that one and doesn't download it again.

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const REPO = 'pke/mfrevealr';
const TAG = 'catalog';
const ROOT = path.resolve(import.meta.dirname, '..');
const SETS_DIR = path.join(ROOT, 'images/sets');
const REVISION_FILE = path.join(SETS_DIR, 'revision.json');

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const out = path.resolve(option('--out') ?? path.join(ROOT, 'dist/catalog'));
const keepRevision = args.includes('--keep-revision');
const publish = args.includes('--publish');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Width and height from a WebP (lossy, lossless or extended) or PNG header. */
function imageSize(buffer) {
  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
  }
  if (
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('not a WebP or PNG image');
  }
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff)};
  }
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

function findImages(dir, found = {}) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findImages(file, found);
      continue;
    }
    const match = entry.name.match(/^(\d{7})\.(webp|png)$/);
    // WebP wins over a PNG of the same figure, as in figureImages.ts.
    if (match && (!found[match[1]] || match[2] === 'webp')) {
      found[match[1]] = file;
    }
  }
  return found;
}

function newRevision() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return Number(
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
      now.getUTCDate(),
    )}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`,
  );
}

const sets = readJson(path.join(SETS_DIR, 'sets.json'));
const series = readJson(path.join(SETS_DIR, 'series.json'));
const files = findImages(SETS_DIR);
const revision = keepRevision
  ? readJson(REVISION_FILE).revision
  : newRevision();

fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});

const images = {};
for (const figures of Object.values(sets)) {
  for (const [title, codes] of Object.entries(figures)) {
    const code = String(codes[0]);
    const source = files[code];
    if (!source) {
      throw new Error(`No image for ${title} (${code})`);
    }
    const buffer = fs.readFileSync(source);
    const file = `${code}${path.extname(source)}`;
    fs.writeFileSync(path.join(out, file), buffer);
    images[code] = {
      file,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      ...imageSize(buffer),
    };
  }
}

const catalog = {format: 1, revision, series, sets, images};
fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify(catalog));
if (!keepRevision) {
  fs.writeFileSync(REVISION_FILE, `${JSON.stringify({revision}, null, 2)}\n`);
}
console.log(
  `Catalog ${revision}: ${Object.keys(sets).length} series, ` +
    `${Object.keys(images).length} figures in ${path.relative(ROOT, out)}`,
);

if (publish) {
  const gh = (...params) =>
    execFileSync('gh', [...params, '--repo', REPO], {stdio: 'inherit'});
  try {
    execFileSync('gh', ['release', 'view', TAG, '--repo', REPO], {
      stdio: 'ignore',
    });
  } catch {
    gh(
      'release',
      'create',
      TAG,
      '--title',
      'Figure catalog',
      '--notes',
      'Series, figures and images the app downloads. Updated in place.',
      '--latest=false',
    );
  }
  const imageFiles = Object.values(images).map(image =>
    path.join(out, image.file),
  );
  // Images first: catalog.json is what apps look at, so it goes up last.
  gh('release', 'upload', TAG, ...imageFiles, '--clobber');
  gh('release', 'upload', TAG, path.join(out, 'catalog.json'), '--clobber');
  console.log(`Published to https://github.com/${REPO}/releases/tag/${TAG}`);
}
