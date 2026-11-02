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
jest.mock('../catalogStore', () => ({
  loadStoredCatalog: async () => {},
  updateCatalog: async () => 'current',
  useCatalogRevision: () => 202611020000,
}));
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({getString: () => undefined, set: () => {}}),
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

it('renders correctly', () => {
  act(() => {
    renderer.create(<App />);
  });
});
