#!/bin/bash
BUNDLE=/tmp/apk_check/assets/index.android.bundle
echo "=== 检查 bundle 中关键修改 ==="
patterns=(
  "billingCycle"
  "tier.heavy"
  "tier.pro"
  "tier.super"
  "tier.medium"
  "tier.expiresAt"
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
  "standardizeDouyinUrl"
  "isFallbackOnlyMetadata"
  "coverStrategy"
  "parsePhase"
  "parse-url"
  "fetch-url"
  "smart-parse"
  "Douyin"
  "iesdouyin"
  "previous_page"
  "app_code_link"
  "parseFallback"
  "limitKeyMap"
  "hiddenBenefitKeys"
  "hiddenBenefitTexts"
  "isBenefitVisible"
)
for kw in "${patterns[@]}"; do
  count=$(grep -ao "$kw" "$BUNDLE" 2>/dev/null | wc -l)
  if [ "$count" -gt "0" ]; then
    echo "  [Y] $kw : $count 次"
  else
    echo "  [ ] $kw : 0 次"
  fi
done
