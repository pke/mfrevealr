import fs from 'node:fs';
import path from 'node:path';
import {anthropic} from '@ai-sdk/anthropic';
import type {E2EConfig} from 'e2e';
import {mobile} from '@e2e-dev/mobile';

// End-to-end tests run against E2E_BUILD=1 builds: release builds whose
// camera is simulated (e2e/app/fakeCamera.tsx), so tests "scan" a box by
// opening a link. They need no camera permission, so none is set: iOS ends
// an app whose permission changes, which raced the launch after clearState.
// Build them with `yarn e2e:build:ios` / `e2e:build:android`.

// Local secrets such as ANTHROPIC_API_KEY (agent tests) live in the
// gitignored e2e/.env.local; CI passes them as environment variables.
const LOCAL_ENV = 'e2e/.env.local';
if (fs.existsSync(LOCAL_ENV)) {
  for (const line of fs.readFileSync(LOCAL_ENV, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    // The shell wins over the file, and an empty value sets nothing.
    if (match && match[2] && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const IOS_APP =
  'build/e2e-ios/Build/Products/Release-iphonesimulator/mfrevealr.app';

// A signed device build (`yarn e2e:build:iphone`) for a connected iPhone.
const IPHONE_APP = 'build/e2e-iphone/Build/Products/Release-iphoneos/mfrevealr.app';

/** The newest release APK; its name carries a build timestamp. */
function androidApk() {
  const dir = 'android/app/build/outputs/apk/release';
  const apks = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter(name => name.endsWith('.apk'))
        .map(name => path.join(dir, name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    : [];
  return apks[0] ?? `${dir}/missing.apk`;
}

// Which simulator or emulator to drive, by UDID, serial or name. Unset, e2e
// takes a booted one, which on a busy Mac may belong to another project.
const pinned = (name: string | undefined) => (name ? {device: name} : {});

export default {
  tests: 'e2e/tests/**/*.e2e.ts',
  targets: [
    {
      name: 'ios',
      engine: mobile({platform: 'ios', ...pinned(process.env.E2E_IOS_DEVICE)}),
      app: {bundleId: 'dev.dudesoft.mfrevealr', appPath: IOS_APP},
    },
    {
      name: 'android',
      engine: mobile({
        platform: 'android',
        ...pinned(process.env.E2E_ANDROID_DEVICE),
      }),
      app: {
        bundleId: 'dev.dudesoft.mfrevealr.app',
        appPath: androidApk(),
      },
    },
    // A connected iPhone, by its name as `npx agent-device devices` lists
    // it; only with E2E_IPHONE set. agent-device signs its XCTest runner with
    // AGENT_DEVICE_IOS_TEAM_ID and AGENT_DEVICE_IOS_BUNDLE_ID.
    ...(process.env.E2E_IPHONE
      ? [
          {
            name: 'iphone',
            engine: mobile({platform: 'ios', device: process.env.E2E_IPHONE}),
            app: {bundleId: 'dev.dudesoft.mfrevealr', appPath: IPHONE_APP},
          },
        ]
      : []),
  ],
  workers: 1,
  agents: {
    default: {
      model: anthropic('claude-sonnet-5-5'),
      system:
        'You are a QA agent testing Mini Figure Revealr, an app that scans ' +
        'the code on LEGO minifigure boxes and shows which figure is inside. ' +
        'Verify every outcome on screen.',
      context:
        'The camera is simulated in this build. A "series" is one set of ' +
        '12 collectible figures; the series sheet lists them as tiles that ' +
        'can be ticked off. The gear button opens Settings.',
    },
  },
} satisfies E2EConfig;
