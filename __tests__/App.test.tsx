/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';

jest.mock('../figureImages', () => ({}));
// Its animations run on the native driver, which tests don't have.
jest.mock('../SplashOverlay', () => ({SplashOverlay: () => null}));
jest.mock('react-native-haptic-feedback', () => ({
  trigger: () => {},
  triggerPattern: () => {},
}));
jest.mock('../catalogStore', () => ({
  loadStoredCatalog: async () => {},
  updateCatalog: async () => 'current',
  getCatalogRevision: () => 202611020000,
  useCatalogRevision: () => 202611020000,
  getCatalogProgress: () => undefined,
  onCatalogProgress: () => () => {},
  useCatalogProgress: () => undefined,
}));
// The real provider waits for native insets before it renders anything.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: () => undefined,
    set: () => {},
    getAllKeys: () => [],
  }),
}));
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: () => undefined,
  useCameraPermission: () => ({
    hasPermission: true,
    requestPermission: jest.fn(),
  }),
  useCodeScanner: (scanner: unknown) => scanner,
}));

it('renders correctly', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<App />);
  });
  expect(
    tree.root.findAll(node => node.props.testID === 'settings-button'),
  ).not.toHaveLength(0);
});
