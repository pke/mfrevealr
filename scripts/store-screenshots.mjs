#!/usr/bin/env node
// Makes the App Store screenshots described in screenshots/config.json:
//
//   1. pixelates the figures of the scenes' series and fits each box photo
//      onto a full screen background (screenshots/generated, gitignored)
//   2. builds the app with STORE_SCREENSHOTS=1, so screenshots/scene.ts stages
//      the scene named by the launch argument -scene instead of the camera
//   3. captures every scene per locale on a temporary simulator
//   4. frames them with the headline into fastlane/screenshots/<locale>/
//
//   yarn screenshots                 # all of the above
//   yarn screenshots --skip-build    # reuse the last screenshot build
//
// Then `fastlane ios upload_screenshots` replaces the ones in App Store Connect.
// Needs Xcode and ImageMagick (brew install imagemagick).

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'screenshots');
const GENERATED = path.join(DIR, 'generated');
const BUILD = path.join(ROOT, 'build/screenshots');
const OUT = path.join(ROOT, 'fastlane/screenshots');
const APP = path.join(
  BUILD,
  'DerivedData/Build/Products/Release-iphonesimulator/mfrevealr.app',
);
const SIMULATOR_NAME = 'mfrevealr-screenshots';

const config = JSON.parse(
  fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'),
);
const {screen, frame} = config;
const skipBuild = process.argv.includes('--skip-build');

// Output is captured (simctl chats on stderr); a failure still reports it.
const run = (command, args, options = {}) =>
  execFileSync(command, args.map(String), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
const magick = (...args) => run('magick', args.flat());
const simctl = (...args) => run('xcrun', ['simctl', ...args]);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fresh = dir => {
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  return dir;
};

/** Blocky figures, like the pixelation the store listing always had. */
function pixelateFigures() {
  const out = fresh(path.join(GENERATED, 'figures'));
  const setDirs = fs.readdirSync(path.join(ROOT, 'images/sets'));
  // The collection shows every series, so a scene opening it needs them all.
  const setIds = config.scenes.some(scene => scene.open === 'collection')
    ? setDirs.flatMap(name => name.match(/^(\d+)-/)?.[1] ?? [])
    : config.scenes.map(scene => scene.setId);
  for (const setId of new Set(setIds)) {
    const setDir = setDirs.find(name => name.startsWith(`${setId}-`));
    if (!setDir) {
      throw new Error(`No images/sets folder for set ${setId}`);
    }
    const files = {};
    for (const file of fs.readdirSync(path.join(ROOT, 'images/sets', setDir))) {
      const match = file.match(/^(\d{7})\.(webp|png)$/);
      // WebP wins over a PNG of the same figure, as in figureImages.ts.
      if (match && (!files[match[1]] || match[2] === 'webp')) {
        files[match[1]] = path.join(ROOT, 'images/sets', setDir, file);
      }
    }
    for (const [code, file] of Object.entries(files)) {
      const [width, height] = magick('identify', '-format', '%w %h', file)
        .split(' ')
        .map(Number);
      magick(file, '-filter', 'box', '-resize', `x${config.pixelate}`,
        '-filter', 'point', '-resize', `${width}x${height}!`,
        path.join(out, `${code}.png`));
    }
  }
}

/**
 * The box photo across the full width at photoTop (points), so the code sits
 * in view; a blurred copy fills the rest of the screen behind the UI.
 */
function makeBackgrounds() {
  const out = fresh(path.join(GENERATED, 'backgrounds'));
  const {width, height, scale} = screen;
  for (const scene of config.scenes) {
    const photo = path.join(DIR, 'photos', scene.photo);
    const photoHeight = Number(
      magick(photo, '-resize', `${width}x`, '-format', '%h', 'info:'),
    );
    const top = Math.round(scene.photoTop * scale);
    magick(
      ['(', photo, '-resize', `${width}x${height}^`, '-gravity', 'center',
        '-extent', `${width}x${height}`, '-blur', '0x40', ')'],
      ['(', photo, '-resize', `${width}x`,
        // Soft top and bottom edges into the blur.
        '(', '-size', `${width}x${photoHeight}`, 'xc:white',
        '(', '-size', `${width}x90`, 'gradient:black-white', ')',
        '-gravity', 'north', '-composite',
        '(', '-size', `${width}x90`, 'gradient:white-black', ')',
        '-gravity', 'south', '-composite', ')',
        '-alpha', 'off', '-compose', 'copy_opacity', '-composite', ')'],
      ['-gravity', 'northwest', '-geometry', `+0${top < 0 ? top : `+${top}`}`,
        '-compose', 'over', '-composite', '-quality', '92'],
      path.join(out, `${scene.name}.jpg`),
    );
  }
}

function build() {
  fs.mkdirSync(BUILD, {recursive: true});
  const log = path.join(BUILD, 'xcodebuild.log');
  console.log(`Building the screenshot app (log: ${path.relative(ROOT, log)})`);
  try {
    run('xcodebuild', [
      '-workspace', 'ios/mfrevealr.xcworkspace',
      '-scheme', 'mfrevealr',
      '-configuration', 'Release',
      '-sdk', 'iphonesimulator',
      '-destination', 'generic/platform=iOS Simulator',
      '-derivedDataPath', path.join(BUILD, 'DerivedData'),
      'build',
    ], {
      cwd: ROOT,
      stdio: ['ignore', fs.openSync(log, 'w'), fs.openSync(log, 'a')],
      env: {
        ...process.env,
        STORE_SCREENSHOTS: '1',
        // The scene module is picked at resolution time; start clean so no
        // cached graph of a regular build sneaks in.
        EXTRA_PACKAGER_ARGS: '--reset-cache',
      },
    });
  } catch (error) {
    console.error(fs.readFileSync(log, 'utf8').split('\n').slice(-30).join('\n'));
    throw error;
  }
}

/** A fresh simulator of the configured device on the newest runtime that has it. */
function createSimulator() {
  const {runtimes} = JSON.parse(simctl('list', 'runtimes', '-j'));
  const candidates = runtimes
    .filter(runtime => runtime.isAvailable && runtime.platform === 'iOS')
    .map(runtime => ({
      runtime,
      type: runtime.supportedDeviceTypes?.find(t => t.name === config.device),
    }))
    .filter(candidate => candidate.type)
    .sort((a, b) =>
      b.runtime.version.localeCompare(a.runtime.version, undefined, {
        numeric: true,
      }),
    );
  for (const {runtime, type} of candidates) {
    try {
      const udid = simctl('create', SIMULATOR_NAME, type.identifier,
        runtime.identifier).trim();
      console.log(`Simulator: ${config.device}, iOS ${runtime.version}`);
      return udid;
    } catch {
      // Some runtimes list a device type they can't create; try the next.
    }
  }
  throw new Error(`No iOS runtime can create an ${config.device}`);
}

// Every store language gets its own screenshots, so a missing headline is an
// error rather than an English fallback.
for (const scene of config.scenes) {
  const missing = config.locales.filter(locale => !scene.headline[locale]);
  if (missing.length) {
    throw new Error(`${scene.name}: no headline for ${missing.join(', ')}`);
  }
}

/** Store locale → the app language and region to launch it in. */
function launchLanguage(locale) {
  const [language, region] = locale.split('-');
  if (language === 'zh') {
    return {languages: '(zh-Hans)', locale: 'zh_CN'};
  }
  return {
    languages: `(${language})`,
    locale: `${language}_${region ?? language.toUpperCase()}`,
  };
}

/** The largest size up to 104 at which every line fits the width. */
function headlineSize(lines, font) {
  const maxWidth = screen.width - 2 * 80;
  const widths = lines.map(line =>
    Number(magick('-font', font, '-pointsize', '104', `label:${line}`,
      '-format', '%w', 'info:')),
  );
  return Math.min(104, Math.floor((104 * maxWidth) / Math.max(...widths)));
}

/** Device frame and headline on the splash yellow, at the screenshot's size. */
function compose(shot, lines, font, out) {
  const {width, height} = screen;
  const screenWidth = Math.round(width * 0.765);
  const k = screenWidth / width;
  const screenHeight = Math.round(height * k);
  const radius = Math.round(55 * screen.scale * k);
  const bezel = 26;
  const island = Math.round(33 * k);
  const tmp = path.join(BUILD, 'frame.png');
  magick(
    shot, '-resize', `${screenWidth}x${screenHeight}!`,
    '(', '-size', `${screenWidth}x${screenHeight}`, 'xc:black', '-fill', 'white',
    '-draw', `roundrectangle 0,0,${screenWidth - 1},${screenHeight - 1},${radius},${radius}`, ')',
    '-alpha', 'off', '-compose', 'copy_opacity', '-composite',
    '-compose', 'over', '-fill', 'black',
    // Simulator screenshots leave out the Dynamic Island.
    '-draw', `roundrectangle ${screenWidth / 2 - 140},${island},${screenWidth / 2 + 140},${island + 92},46,46`,
    '(', '-size', `${screenWidth + 2 * bezel}x${screenHeight + 2 * bezel}`, 'xc:none',
    '-fill', '#0b0b0b', '-draw',
    `roundrectangle 0,0,${screenWidth + 2 * bezel - 1},${screenHeight + 2 * bezel - 1},${radius + bezel},${radius + bezel}`,
    ')', '+swap', '-geometry', `+${bezel}+${bezel}`, '-composite', tmp,
  );
  const args = ['-size', `${width}x${height}`, `xc:${frame.background}`];
  const size = headlineSize(lines, font.file);
  let y = 190;
  for (const line of lines) {
    args.push('-font', font.file, '-pointsize', size, '-fill', frame.headline,
      // A stroke thickens fonts that have no bold face here, like Chinese.
      '-stroke', font.stroke ? frame.headline : 'none',
      '-strokewidth', font.stroke ?? 0,
      '-gravity', 'north', '-annotate', `+0+${y}`, line);
    y += 128;
  }
  magick(args, tmp, '-gravity', 'north', '-geometry', `+0+${y + 70}`,
    '-composite', '-alpha', 'off', out);
  fs.rmSync(tmp);
}

async function capture(udid, bundleId) {
  const raw = path.join(BUILD, 'raw');
  for (const locale of config.locales) {
    const {languages, locale: region} = launchLanguage(locale);
    // A locale can bring its own font: {file, stroke}.
    const font = frame.fonts?.[locale] ?? {file: frame.font};
    const out = fresh(path.join(OUT, locale));
    fs.mkdirSync(path.join(raw, locale), {recursive: true});
    for (const [index, scene] of config.scenes.entries()) {
      simctl('ui', udid, 'appearance', scene.appearance);
      simctl('launch', '--terminate-running-process', udid, bundleId,
        '-scene', scene.name,
        '-AppleLanguages', languages,
        '-AppleLocale', region);
      // Images decode, and a sheet opens one second in and then animates.
      await sleep(scene.open ? 7000 : 5000);
      const shot = path.join(raw, locale, `${scene.name}.png`);
      simctl('io', udid, 'screenshot', shot);
      const name = `${String(index + 1).padStart(2, '0')}_${scene.name}.png`;
      compose(shot, scene.headline[locale], font, path.join(out, name));
      console.log(`  ${locale}/${name}`);
    }
    const sheet = path.join(BUILD, `overview-${locale}.png`);
    magick(path.join(out, '*.png'), '-resize', 'x1000', '-background', 'white',
      '-splice', '16x0', '+append', sheet);
    console.log(`Overview: ${path.relative(ROOT, sheet)}`);
  }
}

pixelateFigures();
makeBackgrounds();
if (!skipBuild) {
  build();
}
const bundleId = run('plutil',
  ['-extract', 'CFBundleIdentifier', 'raw', path.join(APP, 'Info.plist')]).trim();
const udid = createSimulator();
try {
  simctl('boot', udid);
  simctl('bootstatus', udid, '-b');
  simctl('status_bar', udid, 'override', '--time', '9:41',
    '--batteryState', 'charged', '--batteryLevel', '100',
    '--cellularBars', '4', '--wifiBars', '3', '--operatorName', '');
  simctl('install', udid, APP);
  simctl('privacy', udid, 'grant', 'camera', bundleId);
  await capture(udid, bundleId);
} finally {
  try {
    simctl('shutdown', udid);
  } catch {
    // It may not have booted.
  }
  simctl('delete', udid);
}
