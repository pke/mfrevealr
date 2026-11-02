import SETS from './images/sets/sets.json';
import SERIES from './images/sets/series.json';
import REVISION from './images/sets/revision.json';
import type {Series, Sets} from './resolveCode';

// The catalog built into the app, and where newer ones come from: the assets
// of one GitHub release, with catalog.json listing everything else in it.
// End-to-end test builds swap this module (metro.config.js).

export const BUNDLED: {revision: number; sets: Sets; series: Series} = {
  revision: REVISION.revision,
  sets: SETS as Sets,
  series: SERIES,
};

export const CATALOG_URL =
  'https://github.com/pke/mfrevealr/releases/download/catalog/';
