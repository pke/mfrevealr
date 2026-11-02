import {Platform} from 'react-native';
import SETS from '../../images/sets/sets.json';
import SERIES from '../../images/sets/series.json';
import type {Series, Sets} from '../../resolveCode';
import E2E from '../catalog.json';

// Stands in for catalogSource.ts in end-to-end test builds. The app comes
// with an older catalog that lacks the newest series, so tests can update it,
// and updates come from the tests' own server (e2e/catalogServer.ts) on the
// Mac, which the Android emulator reaches as 10.0.2.2.

const without = <T extends object>(all: T) =>
  Object.fromEntries(
    Object.entries(all).filter(([setId]) => setId !== E2E.missingSeries),
  ) as T;

export const BUNDLED: {revision: number; sets: Sets; series: Series} = {
  revision: E2E.bundledRevision,
  sets: without(SETS as Sets),
  series: without(SERIES as Series),
};

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const CATALOG_URL = `http://${HOST}:${E2E.port}/`;
