#!/bin/bash
set -e
APK=/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606182307.apk
rm -rf /tmp/apk_check
mkdir -p /tmp/apk_check
unzip -q "$APK" 'assets/*' -d /tmp/apk_check
BUNDLE=/tmp/apk_check/assets/index.android.bundle
echo "=== Bundle status ==="
ls -la "$BUNDLE"
echo ""
echo "=== Bundle MD5 (确认是最新 bundle) ==="
md5sum "$BUNDLE"
echo ""
echo "=== 检查 bundle 中关键修改 ==="
patterns=(
  "billingCycle"
  "tier.heavyExpiresAt"
  "monthly"
  "yearly"
  "tier.collections"
  "tier.tags"
  "tier.lists"
  "tier.shares"
  "tier.shareItems"
  "tier.coverImages"
  "tier.maxItemsPerShare"
  "tier.dailyImportLimit"
  "tier.metadataDailyLimit"
  "tier.trashRetentionDays"
  "tier.coverImagesDaily"
  "limitKeyMap"
  "hiddenBenefitKeys"
  "hiddenBenefitTexts"
  "isBenefitVisible"
  "needsCoverFallback"
  "coverStrategy"
  "parsePhase"
  "parse-url"
  "fetch-url"
  "smart-parse"
  "iesdouyin"
  "previous_page"
  "app_code_link"
)
for kw in "${patterns[@]}"; do
  count=$(grep -ao "$kw" "$BUNDLE" 2>/dev/null | wc -l)
  if [ "$count" -gt "0" ]; then
    echo "  [Y] $kw : $count 次"
  else
    echo "  [ ] $kw : 0 次"
  fi
done
echo ""
echo "=== 检查翻译键 (tier.* 配对) ==="
for kw in "tier\\.heavy" "tier\\.pro" "tier\\.super" "tier\\.medium" "tier\\.expiresAt" "tier\\.collections" "tier\\.tags" "tier\\.lists" "tier\\.shareItems" "tier\\.dailyImportLimit" "tier\\.maxItemsPerShare" "tier\\.metadataDailyLimit" "tier\\.trashRetentionDays" "tier\\.coverImagesDaily"; do
  count=$(grep -aoE "$kw" "$BUNDLE" 2>/dev/null | wc -l)
  if [ "$count" -gt "0" ]; then
    echo "  [Y] $kw : $count 次"
  else
    echo "  [ ] $kw : 0 次"
  fi
done
