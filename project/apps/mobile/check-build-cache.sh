#!/bin/bash
set -e

echo "=== 1. Checking source en.json ==="
cat /mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/en.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('  pro:', repr(d.get('tier',{}).get('pro'))); print('  super:', repr(d.get('tier',{}).get('super')))"

echo ""
echo "=== 2. Checking Gradle bundle output ==="
BUNDLE="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"
if [ -f "$BUNDLE" ]; then
    echo "  Bundle exists, size: $(stat -c%s "$BUNDLE") bytes"
    PRO_COUNT=$(strings "$BUNDLE" | grep -c '"pro":"Pro"' || true)
    SUPER_COUNT=$(strings "$BUNDLE" | grep -c '"super":"Ultimate"' || true)
    TIERPRO_COUNT=$(strings "$BUNDLE" | grep -c 'tier\.pro' || true)
    echo "  'pro':'Pro' count: $PRO_COUNT"
    echo "  'super':'Ultimate' count: $SUPER_COUNT"
    echo "  tier.pro count: $TIERPRO_COUNT"
else
    echo "  Bundle NOT FOUND"
fi

echo ""
echo "=== 3. Checking APK bundle ==="
APK="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606011244.apk"
if [ -f "$APK" ]; then
    unzip -p "$APK" assets/index.android.bundle > /tmp/apk-bundle.txt
    PRO_COUNT=$(strings /tmp/apk-bundle.txt | grep -c '"pro":"Pro"' || true)
    SUPER_COUNT=$(strings /tmp/apk-bundle.txt | grep -c '"super":"Ultimate"' || true)
    TIERPRO_COUNT=$(strings /tmp/apk-bundle.txt | grep -c 'tier\.pro' || true)
    echo "  'pro':'Pro' count: $PRO_COUNT"
    echo "  'super':'Ultimate' count: $SUPER_COUNT"
    echo "  tier.pro count: $TIERPRO_COUNT"
else
    echo "  APK NOT FOUND"
fi

echo ""
echo "=== 4. Checking Gradle task timestamps ==="
find /mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china -name "*.bin" -path "*createBundle*" 2>/dev/null | head -5

echo ""
echo "=== 5. Checking Metro cache ==="
find /tmp -maxdepth 2 -name "*metro*" -type d 2>/dev/null || true
find /mnt/d/trae_projects/linkchest/project/apps/mobile -name ".metro" -type d 2>/dev/null || true
ls -la /mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/.cache/ 2>/dev/null || true

echo ""
echo "=== 6. Checking if en.json mtime is newer than bundle mtime ==="
stat -c "%y %n" /mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/en.json
stat -c "%y %n" "$BUNDLE" 2>/dev/null || true
