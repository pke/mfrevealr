#!/bin/sh
# Store builds only: removes the App Transport Security exception for local
# networks. Debug builds need it to load the JS bundle from Metro on the Mac,
# and E2E_BUILD=1 builds to download the test catalog from localhost; a
# Release build for the store talks to nothing but HTTPS.
# The phase lists the processed Info.plist as its input, so Xcode runs it
# after writing that file, not before.
set -e
[ "$CONFIGURATION" = "Release" ] && [ -z "$E2E_BUILD" ] || exit 0
plist="$TARGET_BUILD_DIR/$INFOPLIST_PATH"
/usr/libexec/PlistBuddy \
  -c "Delete :NSAppTransportSecurity:NSAllowsLocalNetworking" "$plist" \
  2>/dev/null || true
echo "Local networking exception removed"
