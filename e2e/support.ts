import {test as base} from '@e2e-dev/mobile';
import type {Device} from '@e2e-dev/mobile';
import {expect} from 'e2e';

/** Data matrix values of real boxes: the figure's code, then batch data. */
export const BOX = {
  barbarian: '6472860 2401',
  fitness: '6472861 2401',
  sprite: '6472862 2401',
  goatherd: '6472863 2401',
  blacktron: '6484685 2401', // Series 26 Space
  // Shrek Series: missing from the catalog test builds come with.
  thelonious: '6634903 2401',
  // Only in the 'next' catalog of e2e/catalogServer.ts.
  testPilot: '9999901 2401',
};

/** Every figure code of Series 25, in catalog order. */
export const SERIES_25 = Array.from({length: 12}, (_, i) =>
  String(6472860 + i),
);

// Once per test file (each runs in its own realm): the build under test.
let installed = false;

/**
 * Every test starts on a freshly launched app with no data, so settings and
 * collections never leak from one test into the next.
 */
export const test = base.extend<{fresh: void}>({
  fresh: async ({app, device}, provide) => {
    if (!installed) {
      // A plain install: replacing an app that isn't there fails on
      // Android, and clearState below wipes the data anyway.
      await device.installApp();
      installed = true;
    }
    try {
      await app.clearState();
    } catch (error) {
      // Physical iPhones can't wipe an app's data in place; a fresh install
      // starts it with none just the same, only slower.
      if ((error as {code?: string}).code !== 'UNSUPPORTED_CAPABILITY') {
        throw error;
      }
      await device.installApp(undefined, {reinstall: true});
    }
    await app.open();
    await provide();
  },
});

/**
 * A physical iPhone, which can't reach the catalog server on the Mac as
 * localhost the way simulators and emulators do.
 */
export const onPhysicalDevice = (device: Device) =>
  device.unstable_raw.session.startsWith('e2e-iphone-');

/**
 * Waits out the splash that opens every launch (SplashOverlay.tsx). Only
 * screenshots need it: it hides nothing from the accessibility tree.
 */
export const splashGone = () =>
  new Promise(resolve => setTimeout(resolve, 1600));

/** Holds boxes up to the simulated camera, all in one frame. */
export async function scan(device: Device, ...values: string[]) {
  const codes = values.map(encodeURIComponent).join(',');
  await device.openLink(`mfrevealr-e2e://scan/${codes}`);
}

export {expect};
