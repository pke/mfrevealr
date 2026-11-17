import {ImageSourcePropType, Platform, Settings} from 'react-native';
import type {StoreScene} from '../storeScene';
import config from './config.json';

// Stands in for storeScene.ts in screenshot builds. On iOS the scene is picked
// with the launch argument `-scene <name>`, which iOS hands to NSUserDefaults;
// Android has nothing like it, so each scene gets a build of its own, named in
// generated/scene.json. Backgrounds, pixelated figures and that file are made
// by scripts/store-screenshots.mjs.

const backgrounds = require.context('./generated/backgrounds', false, /\.jpg$/);
const figures = require.context('./generated/figures', false, /\d{7}\.png$/);

const name =
  Platform.OS === 'ios'
    ? Settings.get('scene')
    : require('./generated/scene.json').name;
const scene = config.scenes.find(entry => entry.name === name);

export const STORE_SCENE: StoreScene | undefined = scene && {
  layout: scene.layout as StoreScene['layout'],
  photo: backgrounds(`./${scene.name}.jpg`),
  setId: scene.setId,
  scan: scene.scan,
  found: scene.found,
  collection: 'collection' in scene ? scene.collection : undefined,
  open: scene.open as StoreScene['open'],
};

export const SCENE_FIGURES: Record<string, ImageSourcePropType> =
  Object.fromEntries(
    figures.keys().map(key => [key.match(/(\d{7})/)![1], figures(key)]),
  );
