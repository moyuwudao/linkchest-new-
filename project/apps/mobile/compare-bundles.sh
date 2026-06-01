#!/bin/bash
set -e

GEN="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"
INT="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/intermediates/assets/chinaRelease/index.android.bundle"

echo "=== Generated bundle ==="
if [ -f "$GEN" ]; then
    stat -c "%y %s" "$GEN"
    GEN_PRO=$(strings "$GEN" | grep -c '"pro":"Pro"' || true)
    GEN_SUPER=$(strings "$GEN" | grep -c '"super":"Ultimate"' || true)
    GEN_TIER=$(strings "$GEN" | grep -c 'tier\.pro' || true)
    echo "  pro:Pro=$GEN_PRO super:Ultimate=$GEN_SUPER tier.pro=$GEN_TIER"
else
    echo "  NOT FOUND"
fi

echo ""
echo "=== Intermediates bundle ==="
if [ -f "$INT" ]; then
    stat -c "%y %s" "$INT"
    INT_PRO=$(strings "$INT" | grep -c '"pro":"Pro"' || true)
    INT_SUPER=$(strings "$INT" | grep -c '"super":"Ultimate"' || true)
    INT_TIER=$(strings "$INT" | grep -c 'tier\.pro' || true)
    echo "  pro:Pro=$INT_PRO super:Ultimate=$INT_SUPER tier.pro=$INT_TIER"
else
    echo "  NOT FOUND"
fi

echo ""
echo "=== Are they identical? ==="
if [ -f "$GEN" ] && [ -f "$INT" ]; then
    if cmp -s "$GEN" "$INT"; then
        echo "YES - identical"
    else
        echo "NO - different"
    fi
fi
