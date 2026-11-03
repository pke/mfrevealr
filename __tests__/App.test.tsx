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

// The layout the app starts in, switched by the tests below.
let mockLayout = 'card';
jest.mock('../settings', () => {
  const settings = () => ({
    theme: 'system',
    layout: mockLayout,
    language: 'system',
    codeOverlay: false,
  });
  return {loadSettings: settings, useSettings: () => [settings(), () => {}]};
});

it('renders correctly', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<App />);
  });
  expect(
    tree.root.findAll(node => node.props.testID === 'settings-button'),
  ).not.toHaveLength(0);
});

it('measures the camera anew when a layout moves it', async () => {
  // The split layout's camera sits above the checklist; the strip's fills
  // the screen. Figures are placed by the size the camera's view reports,
  // which a view reused from another layout never reports again: the strip's
  // must be a view of its own.
  type Node = {_fiber: {stateNode: unknown}};
  const views = (tree: renderer.ReactTestRenderer) =>
    tree.root
      .findAll(node => typeof node.type === 'string')
      .map(node => (node as unknown as Node)._fiber.stateNode);
  const cameraView = (tree: renderer.ReactTestRenderer) =>
    (
      tree.root.find(
        node =>
          node.props.testID === 'camera-view' && typeof node.type === 'string',
      ) as unknown as Node
    )._fiber.stateNode;
  mockLayout = 'split';
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<App />);
  });
  const split = new Set(views(tree));
  mockLayout = 'strip';
  await act(async () => {
    tree.update(<App />);
  });
  expect(split.has(cameraView(tree))).toBe(false);
  mockLayout = 'card';
});
