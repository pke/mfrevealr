#!/bin/sh
# E2E_BUILD=1 builds only: registers the mfrevealr-e2e:// link that end-to-end
# tests open to feed scans to the simulated camera (e2e/app/fakeCamera.tsx).
# Store builds don't declare it, so no app or page can open such a link.
set -e
[ -n "$E2E_BUILD" ] || exit 0
plist="$TARGET_BUILD_DIR/$INFOPLIST_PATH"
/usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$plist" 2>/dev/null || true
/usr/libexec/PlistBuddy \
  -c "Add :CFBundleURLTypes array" \
  -c "Add :CFBundleURLTypes:0 dict" \
  -c "Add :CFBundleURLTypes:0:CFBundleURLName string dev.dudesoft.mfrevealr.e2e" \
  -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" \
  -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string mfrevealr-e2e" \
  "$plist"
echo "Test link mfrevealr-e2e:// registered"
