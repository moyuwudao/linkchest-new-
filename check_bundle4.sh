#!/bin/bash
BUNDLE=/tmp/apk_check/assets/index.android.bundle
echo "=== 检查 bundle 中关键修改 (纯 ASCII 关键词) ==="
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
  "LimitKeyMap"
  "hiddenBenefitKeys"
  "hiddenBenefitTexts"
  "isBenefitVisible"
  "tier-upgrade"
  "loadTierData"
  "isHeavy"
  "tierData.heavyExpiresAt"
)
for kw in "${patterns[@]}"; do
  count=$(grep -c "$kw" "$BUNDLE" 2>/dev/null)
  if [ "$count" -gt "0" ]; then
    echo "  [Y] $kw : $count 次"
  else
    echo "  [N] $kw : 0 次"
  fi
done
