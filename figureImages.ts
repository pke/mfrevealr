import {ImageSourcePropType} from 'react-native';
import {SCENE_FIGURES} from './storeScene';

// Figure images are named after their 7 digit primary code. Prefer webp over
// png when both exist so the result does not depend on bundler key order.
const imageContexts = require.context(
  './images/sets',
  true,
  /\/\d{7}\.(png|webp)$/,
);
const BUNDLED: Record<string, ImageSourcePropType> = {};
imageContexts
  .keys()
  .sort((a, b) => (a.endsWith('.webp') ? 1 : 0) - (b.endsWith('.webp') ? 1 : 0))
  .forEach(key => {
    const match = key.match(/\/(\d{7})\.(png|webp)$/);
    if (match) {
      BUNDLED[match[1]] = imageContexts(key);
    }
  });

// Pixelated stand-ins while a store screenshot scene is staged.
Object.assign(BUNDLED, SCENE_FIGURES);

/** Bundled images, overlaid by the ones of a downloaded catalog. */
const IMAGES: Record<string, ImageSourcePropType> = {...BUNDLED};

export type DownloadedImage = {uri: string; width: number; height: number};

/**
 * Overlays downloaded images on the bundled ones. The size travels with them,
 * so `Image.resolveAssetSource` knows their shape like it does for bundled
 * images.
 */
export function setDownloadedImages(images: Record<string, DownloadedImage>) {
  for (const code of Object.keys(IMAGES)) {
    delete IMAGES[code];
  }
  Object.assign(IMAGES, BUNDLED, images);
}

export default IMAGES;
