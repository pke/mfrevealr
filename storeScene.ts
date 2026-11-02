import type {ImageSourcePropType} from 'react-native';
import type {Layout} from './settings';

/**
 * A staged scene for App Store screenshots: a box photo in place of the
 * camera, a collection in progress and maybe a sheet open. Only
 * `yarn screenshots` bundles one (screenshots/scene.ts, swapped in by
 * metro.config.js); the app itself always gets this empty stub.
 */
export type StoreScene = {
  layout: Layout;
  photo: ImageSourcePropType;
  setId: string;
  scan: string;
  found: string[];
  open?: 'series' | 'settings';
};

export const STORE_SCENE: StoreScene | undefined = undefined;

/** Figure images replacing the bundled ones while a scene is staged. */
export const SCENE_FIGURES: Record<string, ImageSourcePropType> = {};
