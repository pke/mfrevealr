import {Platform, Settings} from 'react-native';
import {version} from './package.json';

/**
 * The app's version, with the build number on iOS, e.g. "10.0.0 (3)": a
 * build step writes it into the Settings bundle, whose defaults the app
 * delegate registers, so it matches the iOS Settings app. Android has no
 * such shortcut, so it gets package.json's version, which the native
 * versions follow.
 */
export function appVersion(): string {
  if (Platform.OS === 'ios') {
    try {
      const native = Settings.get('version');
      if (typeof native === 'string' && native) {
        return native;
      }
    } catch {
      // No native settings module, as in tests.
    }
  }
  return version;
}
