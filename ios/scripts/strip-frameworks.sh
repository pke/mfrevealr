#!/bin/sh
# Release builds only. The prebuilt React Native frameworks (React, hermesvm,
# ReactNativeDependencies) ship with their full local symbol tables, about
# 9 MB the app never uses; CocoaPods' embed step only thins architectures.
# The symbols go into dSYMs first, so crash reports still get names.
set -e
[ "$CONFIGURATION" = "Release" ] || exit 0

cd "$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH" 2>/dev/null || exit 0
for framework in *.framework; do
  [ -d "$framework" ] || continue
  name=$(/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "$framework/Info.plist")
  binary="$framework/$name"
  if [ -n "$DWARF_DSYM_FOLDER_PATH" ]; then
    xcrun dsymutil "$binary" -o "$DWARF_DSYM_FOLDER_PATH/$framework.dSYM" 2>/dev/null || true
  fi
  before=$(stat -f%z "$binary")
  xcrun strip -x "$binary"
  echo "Stripped $name: $before -> $(stat -f%z "$binary") bytes"
  if [ "$CODE_SIGNING_ALLOWED" != "NO" ]; then
    codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY:--}" \
      --preserve-metadata=identifier,entitlements,flags "$framework"
  fi
done
