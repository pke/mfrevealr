const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Screenshot builds (scripts/store-screenshots.mjs) stage scenes for the App
// Store; every other build gets the empty storeScene.ts.
const SCENE = path.join(__dirname, 'screenshots/scene.ts');

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
  resolver: process.env.STORE_SCREENSHOTS
    ? {
        resolveRequest: (context, moduleName, platform) =>
          moduleName === './storeScene'
            ? {type: 'sourceFile', filePath: SCENE}
            : context.resolveRequest(context, moduleName, platform),
      }
    : {},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
