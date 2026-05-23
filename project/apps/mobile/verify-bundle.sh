#!/bin/bash
BUNDLE="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

echo "=== API URL check ==="
echo -n "linkchest.net: "
strings "$BUNDLE" | grep -c 'linkchest.net'
echo -n "43.136.82.88: "
strings "$BUNDLE" | grep -c '43.136.82.88'

echo ""
echo "=== Context for 43.136.82.88 ==="
strings "$BUNDLE" | grep -B1 -A1 '43.136.82.88' | head -10
