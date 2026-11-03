import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

/**
 * iCloud's key-value store (NSUbiquitousKeyValueStore), which syncs small
 * values between the devices signed in to the same Apple Account. iOS only;
 * elsewhere the module is missing.
 */
export interface Spec extends TurboModule {
  /** Every key and its value, as a JSON object. */
  getAll(): string;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Keys another device changed, comma separated. */
  readonly onChange: CodegenTypes.EventEmitter<string>;
}

export default TurboModuleRegistry.get<Spec>('CloudKeyValues');
