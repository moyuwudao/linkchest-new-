#!/bin/bash
BUNDLE=/tmp/apk_check/assets/index.android.bundle
echo "=== 检查翻译键是否在 bundle 中 ==="
for kw in '"heavy"' '"super"' '"pro"' '"medium"' 'tier.heavy' 'tier.pro' 'tier.super' 'tier.medium' 'tier.expiresAt' 'monthly' 'yearly' 'tier.collections' 'tier.tags' 'tier.lists' 'tier.shares' 'tier.shareItems' 'tier.coverImages' 'tier.maxItemsPerShare' 'tier.dailyImportLimit' 'tier.metadataDailyLimit' 'tier.trashRetentionDays' 'tier.coverImagesDaily' 'standardizeDouyinUrl' 'isFallbackOnlyMetadata' 'coverStrategy' 'parsePhase' 'parse-url' 'fetch-url' 'smart-parse' 'Douyin' '抖音' 'iesdouyin' 'previous_page' 'app_code_link' 'parseFallback'; do
  count=$(grep -ao "$kw" "$BUNDLE" 2>/dev/null | wc -l)
  if [ "$count" -gt "0" ]; then
    echo "  [✓] $kw : $count 次"
  else
    echo "  [ ] $kw : 0 次"
  fi
done
