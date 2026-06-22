#!/bin/bash
# 小红书抓取 API 测试
URL_BASE="http://127.0.0.1:3001"

URL1="https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed"
URL2="https://www.xiaohongshu.com/explore/6a1a90d50000000035022684?xsec_token=ABcVkkW4d9egCfTWOkZDbyT44XyrEmDarZxxM1GaXqqKw=&xsec_source=pc_feed"
URL3="https://www.xiaohongshu.com/explore/6a27d536000000002202e62a?xsec_token=ABsDPhAna68SUr3vg1v5jVAzvnREgfCf329YC7khlvWxM=&xsec_source=pc_feed"

test_url() {
  local url=$1
  echo "============================================================"
  echo "URL: ${url:0:80}..."
  echo "============================================================"
  # 1. 清理缓存（使用 sed 转义 & 符号为 \& 避免 redis-cli 解析问题）
  local safe_url=$(echo -n "$url" | sed 's/&/\\&/g')
  redis-cli del "md:${url}" 2>/dev/null
  # 2. 调用 API
  local body=$(printf '{"url":"%s"}' "$url")
  local start=$(date +%s%3N)
  local resp=$(curl -s -X POST "$URL_BASE/api/collections/parse-url" -H "Authorization: Bearer dummy" -H "Content-Type: application/json" --data-raw "$body" -m 60)
  local end=$(date +%s%3N)
  local dur=$((end - start))
  echo "Duration: ${dur}ms"
  echo "Response:"
  echo "$resp" | head -c 2000
  echo ""
  echo ""
}

test_url "$URL1"
test_url "$URL2"
test_url "$URL3"
