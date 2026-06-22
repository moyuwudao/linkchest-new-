#!/bin/bash
set -e
rm -rf /tmp/apk_check
mkdir -p /tmp/apk_check
cd /tmp/apk_check
APK=/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606182307.apk
echo "=== APK 信息 ==="
ls -la "$APK"
echo ""
echo "=== bundle 信息 ==="
unzip -q "$APK" 'assets/*' -d /tmp/apk_check
ls -la /tmp/apk_check/assets/
echo ""
echo "=== 检查关键修改是否已打包进 bundle ==="
BUNDLE=/tmp/apk_check/assets/index.android.bundle
for kw in billingCycle 进阶版 普通版 previous_page standardizeDouyinUrl tier.collections tier.shareItems isFallbackOnlyMetadata smart-parse fetch-url tier.coverImages tier.dailyImportLimit heavyExpires iesdouyin; do
  count=$(grep -ao "$kw" "$BUNDLE" 2>/dev/null | wc -l)
  echo "  $kw : $count 次"
done
