#!/bin/bash
BUNDLE="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

echo "=== Context around tier.pro in bundle ==="
strings "$BUNDLE" | grep -B2 -A2 'tier\.pro' | head -20

echo ""
echo "=== All tier-related strings in bundle ==="
strings "$BUNDLE" | grep 'tier\.' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== Checking if i18n keys are bundled as-is ==="
strings "$BUNDLE" | grep -E '"(pro|super|tierManagement|perMonth|perYear)"' | head -20
