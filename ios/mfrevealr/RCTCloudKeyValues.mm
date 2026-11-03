// iCloud's key-value store for JS (specs/NativeCloudKeyValues.ts): syncs the
// collection between the devices of the same Apple Account. Without iCloud
// it still answers, from what this device last had.

#import <Foundation/Foundation.h>
#import <MfrevealrSpecs/MfrevealrSpecs.h>

@interface RCTCloudKeyValues : NativeCloudKeyValuesSpecBase <NativeCloudKeyValuesSpec>
@end

@implementation RCTCloudKeyValues {
  BOOL _watching;
}

+ (NSString *)moduleName
{
  return @"CloudKeyValues";
}

// React Native makes two instances: RCTModuleProviders keeps one only to ask
// it for the JS module, and the other is the one JS talks to. Only that one,
// once connected for its events, watches iCloud.
- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
  [super setEventEmitterCallback:eventEmitterCallbackWrapper];
  if (_watching) {
    return;
  }
  _watching = YES;
  NSUbiquitousKeyValueStore *store = [NSUbiquitousKeyValueStore defaultStore];
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(storeDidChange:)
                                               name:NSUbiquitousKeyValueStoreDidChangeExternallyNotification
                                             object:store];
  // Fetches what other devices changed while the app wasn't running.
  [store synchronize];
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)storeDidChange:(NSNotification *)notification
{
  NSArray<NSString *> *keys = notification.userInfo[NSUbiquitousKeyValueStoreChangedKeysKey];
  if (keys.count > 0) {
    [self emitOnChange:[keys componentsJoinedByString:@","]];
  }
}

- (NSString *)getAll
{
  NSMutableDictionary<NSString *, NSString *> *strings = [NSMutableDictionary dictionary];
  [[[NSUbiquitousKeyValueStore defaultStore] dictionaryRepresentation]
      enumerateKeysAndObjectsUsingBlock:^(NSString *key, id value, BOOL *stop) {
        if ([value isKindOfClass:[NSString class]]) {
          strings[key] = value;
        }
      }];
  NSData *json = [NSJSONSerialization dataWithJSONObject:strings options:0 error:nil];
  return json ? [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding] : @"{}";
}

- (NSString *_Nullable)get:(NSString *)key
{
  return [[NSUbiquitousKeyValueStore defaultStore] stringForKey:key];
}

- (void)set:(NSString *)key value:(NSString *)value
{
  [[NSUbiquitousKeyValueStore defaultStore] setString:value forKey:key];
}

- (void)remove:(NSString *)key
{
  [[NSUbiquitousKeyValueStore defaultStore] removeObjectForKey:key];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCloudKeyValuesSpecJSI>(params);
}

@end
