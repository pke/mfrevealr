#!/bin/sh
# Writes "<version> (<build>)" into the built app's Settings.bundle, as the
# value of its Version line on the app's page in the iOS Settings app. The
# app registers the bundle's defaults at launch, so the settings sheet reads
# the same value (appVersion.ts).
set -e
app="$TARGET_BUILD_DIR/$WRAPPER_NAME"
version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$app/Info.plist")
build=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$app/Info.plist")
root="$app/Settings.bundle/Root.plist"

i=0
while /usr/libexec/PlistBuddy -c "Print :PreferenceSpecifiers:$i" "$root" >/dev/null 2>&1; do
  key=$(/usr/libexec/PlistBuddy -c "Print :PreferenceSpecifiers:$i:Key" "$root" 2>/dev/null || true)
  if [ "$key" = "version" ]; then
    /usr/libexec/PlistBuddy -c "Set :PreferenceSpecifiers:$i:DefaultValue $version ($build)" "$root"
    echo "Settings.bundle version: $version ($build)"
    exit 0
  fi
  i=$((i + 1))
done
echo "error: no version item in $root" >&2
exit 1
