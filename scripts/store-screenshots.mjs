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
//   yarn screenshots --android       # the same for Google Play
//
// Then `fastlane ios upload_screenshots` replaces the ones in App Store Connect,
// and `fastlane android upload_listing` the ones on Google Play. Needs Xcode,
// or the Android SDK with the mfrevealr-e2e emulator, and ImageMagick (brew
// install imagemagick).

import {execFileSync, spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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
const android = process.argv.includes('--android');

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

/** The largest size up to `largest` at which every line fits the width. */
function headlineSize(lines, font, width = screen.width, largest = 104) {
  const maxWidth = width - 2 * Math.round((80 * width) / screen.width);
  const widths = lines.map(line =>
    Number(magick('-font', font, '-pointsize', largest, `label:${line}`,
      '-format', '%w', 'info:')),
  );
  return Math.min(largest,
    Math.floor((largest * maxWidth) / Math.max(...widths)));
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

// Google Play takes no screenshot more than twice as long as it is wide, so
// the phone stands on a 9:16 canvas there, in an Android frame.
const PLAY = {width: 1080, height: 1920};
const PLAY_OUT = path.join(ROOT, 'fastlane/metadata/android');
const PLAY_LOCALES = {it: 'it-IT', pl: 'pl-PL', ru: 'ru-RU', 'zh-Hans': 'zh-CN'};
const AVD = 'mfrevealr-e2e';
const PACKAGE = 'dev.dudesoft.mfrevealr.app';
const SDK =
  process.env.ANDROID_HOME ?? path.join(os.homedir(), 'Library/Android/sdk');
const ADB = path.join(SDK, 'platform-tools/adb');

/** Which scene the next Android build stages; none for iOS builds. */
function writeScene(name = null) {
  fs.writeFileSync(path.join(GENERATED, 'scene.json'), JSON.stringify({name}));
}

/** The screenshot app staging `scene`: a release build with the debug key. */
function buildAndroid(scene) {
  writeScene(scene.name);
  fs.mkdirSync(BUILD, {recursive: true});
  const log = path.join(BUILD, 'gradle.log');
  console.log(`Building ${scene.name} (log: ${path.relative(ROOT, log)})`);
  const apks = path.join(ROOT, 'android/app/build/outputs/apk/e2e');
  fs.rmSync(apks, {recursive: true, force: true});
  try {
    // Gradle would take the bundle of the scene before as up to date.
    run('./gradlew', ['app:createBundleE2eJsAndAssets', '--rerun', 'app:assembleE2e'], {
      cwd: path.join(ROOT, 'android'),
      stdio: ['ignore', fs.openSync(log, 'w'), fs.openSync(log, 'a')],
      env: {...process.env, STORE_SCREENSHOTS: '1'},
    });
  } catch (error) {
    console.error(fs.readFileSync(log, 'utf8').split('\n').slice(-30).join('\n'));
    throw error;
  }
  const apk = fs.readdirSync(apks).find(name => name.endsWith('.apk'));
  return path.join(apks, apk);
}

/** The project's emulator, started without a window unless it runs already. */
async function bootEmulator() {
  for (const line of run(ADB, ['devices']).split('\n')) {
    const id = line.split('\t')[0];
    if (!id.startsWith('emulator-')) {
      continue;
    }
    try {
      if (run(ADB, ['-s', id, 'emu', 'avd', 'name']).split('\n')[0].trim() === AVD) {
        return {id, started: false};
      }
    } catch {
      // Not answering; not ours.
    }
  }
  const port = 5600;
  spawn(path.join(SDK, 'emulator/emulator'), ['-avd', AVD, '-port', String(port),
    '-no-window', '-no-audio', '-no-boot-anim', '-no-snapshot-save'],
  {detached: true, stdio: 'ignore'}).unref();
  const id = `emulator-${port}`;
  run(ADB, ['-s', id, 'wait-for-device']);
  while (run(ADB, ['-s', id, 'shell', 'getprop', 'sys.boot_completed']).trim() !== '1') {
    await sleep(2000);
  }
  console.log(`Emulator: ${AVD}`);
  return {id, started: true};
}

/** Phone frame and headline on the splash yellow, on Google Play's canvas. */
function composeAndroid(shot, lines, font, out) {
  const {width, height} = PLAY;
  const [shotWidth, shotHeight] = magick('identify', '-format', '%w %h', shot)
    .split(' ').map(Number);
  const largest = Math.round((104 * width) / screen.width);
  const size = headlineSize(lines, font.file, width, largest);
  const lineHeight = Math.round(largest * 1.23);
  const top = Math.round((190 * width) / screen.width);
  const phoneTop = top + lines.length * lineHeight + 40;
  const bezel = 18;
  const screenHeight = height - phoneTop - 2 * bezel - 30;
  const screenWidth = Math.round((screenHeight * shotWidth) / shotHeight);
  const radius = 40;
  const hole = 11;
  const tmp = path.join(BUILD, 'frame.png');
  magick(
    shot, '-resize', `${screenWidth}x${screenHeight}!`,
    '(', '-size', `${screenWidth}x${screenHeight}`, 'xc:black', '-fill', 'white',
    '-draw', `roundrectangle 0,0,${screenWidth - 1},${screenHeight - 1},${radius},${radius}`, ')',
    '-alpha', 'off', '-compose', 'copy_opacity', '-composite',
    // The front camera's punch hole, as on a Pixel.
    '-compose', 'over', '-fill', 'black',
    '-draw', `circle ${screenWidth / 2},${hole + 12} ${screenWidth / 2 + hole},${hole + 12}`,
    '(', '-size', `${screenWidth + 2 * bezel}x${screenHeight + 2 * bezel}`, 'xc:none',
    '-fill', '#0b0b0b', '-draw',
    `roundrectangle 0,0,${screenWidth + 2 * bezel - 1},${screenHeight + 2 * bezel - 1},${radius + bezel},${radius + bezel}`,
    ')', '+swap', '-geometry', `+${bezel}+${bezel}`, '-composite', tmp,
  );
  const args = ['-size', `${width}x${height}`, `xc:${frame.background}`];
  let y = top;
  for (const line of lines) {
    args.push('-font', font.file, '-pointsize', size, '-fill', frame.headline,
      '-stroke', font.stroke ? frame.headline : 'none',
      '-strokewidth', font.stroke ?? 0,
      '-gravity', 'north', '-annotate', `+0+${y}`, line);
    y += lineHeight;
  }
  magick(args, tmp, '-gravity', 'north', '-geometry', `+0+${phoneTop}`,
    '-composite', '-alpha', 'off', out);
  fs.rmSync(tmp);
}

async function captureAndroid() {
  const {id, started} = await bootEmulator();
  const adb = (...args) => run(ADB, ['-s', id, ...args]);
  const night = adb('shell', 'cmd', 'uimode', 'night').trim().split(' ').pop();
  const demo = (command, ...extras) => adb('shell', 'am', 'broadcast', '-a',
    'com.android.systemui.demo', '-e', 'command', command, ...extras);
  const raw = path.join(BUILD, 'raw-android');
  try {
    adb('shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1');
    demo('enter');
    demo('clock', '-e', 'hhmm', '0941');
    demo('battery', '-e', 'level', '100', '-e', 'plugged', 'false');
    demo('network', '-e', 'wifi', 'show', '-e', 'level', '4');
    demo('network', '-e', 'mobile', 'show', '-e', 'datatype', 'none', '-e', 'level', '4');
    demo('notifications', '-e', 'visible', 'false');
    for (const locale of config.locales) {
      fresh(path.join(PLAY_OUT, PLAY_LOCALES[locale] ?? locale, 'images/phoneScreenshots'));
      fs.mkdirSync(path.join(raw, locale), {recursive: true});
    }
    for (const [index, scene] of config.scenes.entries()) {
      adb('install', '-r', buildAndroid(scene));
      adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.CAMERA');
      adb('shell', 'cmd', 'uimode', 'night', scene.appearance === 'dark' ? 'yes' : 'no');
      for (const locale of config.locales) {
        const play = PLAY_LOCALES[locale] ?? locale;
        adb('shell', 'cmd', 'locale', 'set-app-locales', PACKAGE, '--locales', play);
        adb('shell', 'am', 'force-stop', PACKAGE);
        adb('shell', 'am', 'start', '-W', '-n', `${PACKAGE}/dev.dudesoft.mfrevealr.MainActivity`);
        // Images decode, and a sheet opens one second in and then animates.
        await sleep(scene.open ? 7000 : 5000);
        const shot = path.join(raw, locale, `${scene.name}.png`);
        fs.writeFileSync(shot, execFileSync(ADB, ['-s', id, 'exec-out', 'screencap', '-p'],
          // A full-screen PNG is several megabytes.
          {maxBuffer: 64 * 1024 * 1024}));
        const font = frame.fonts?.[locale] ?? {file: frame.font};
        const name = `${String(index + 1).padStart(2, '0')}_${scene.name}.png`;
        // Android has no iCloud; a scene can say so in headlineAndroid.
        const headline = (scene.headlineAndroid ?? scene.headline)[locale];
        composeAndroid(shot, headline, font,
          path.join(PLAY_OUT, play, 'images/phoneScreenshots', name));
        console.log(`  ${play}/${name}`);
      }
    }
  } finally {
    writeScene();
    try {
      demo('exit');
      adb('shell', 'cmd', 'uimode', 'night', night);
      adb('shell', 'cmd', 'locale', 'set-app-locales', PACKAGE, '--locales', '');
    } catch {
      // Gone already.
    }
    if (started) {
      adb('emu', 'kill');
    }
  }
  for (const locale of config.locales) {
    const dir = path.join(PLAY_OUT, PLAY_LOCALES[locale] ?? locale, 'images/phoneScreenshots');
    const sheet = path.join(BUILD, `overview-android-${locale}.png`);
    magick(path.join(dir, '*.png'), '-resize', 'x1000', '-background', 'white',
      '-splice', '16x0', '+append', sheet);
    console.log(`Overview: ${path.relative(ROOT, sheet)}`);
  }
}

pixelateFigures();
makeBackgrounds();
writeScene();
if (android) {
  await captureAndroid();
} else {
  await captureIos();
}

async function captureIos() {
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
}
