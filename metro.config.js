const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Screenshot builds (scripts/store-screenshots.mjs) stage scenes for the App
// Store; every other build gets the empty storeScene.ts.
const SCENE = path.join(__dirname, 'screenshots/scene.ts');
// End-to-end test builds swap the camera for one that tests feed codes into.
const FAKE_CAMERA = path.join(__dirname, 'e2e/app/fakeCamera.tsx');
const SWAPS = {
  ...(process.env.STORE_SCREENSHOTS ? {'./storeScene': SCENE} : {}),
  ...(process.env.E2E_BUILD ? {'./fakeCamera': FAKE_CAMERA} : {}),
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    // figureImages.ts uses require.context to pick up every figure image.
    unstable_allowRequireContext: true,
  },
  resolver: Object.keys(SWAPS).length
    ? {
        resolveRequest: (context, moduleName, platform) =>
          SWAPS[moduleName]
            ? {type: 'sourceFile', filePath: SWAPS[moduleName]}
            : context.resolveRequest(context, moduleName, platform),
      }
    : {},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
