#!/bin/bash
# 测试不同 cookie 注入效果
cd /opt/linkchest/api/project/apps/api
export XHS_COOKIE='web_session=030037ad1924c5545171fd36522d4a9b69bf19; a1=19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701'

# 先清理缓存
URL1='https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'
redis-cli del "md:${URL1}" 2>/dev/null

# 直接调用 API
URL_BASE="http://127.0.0.1:3001"
BODY=$(printf '{"url":"%s"}' "$URL1")
echo "=== Test 1: web_session + a1 ==="
START=$(date +%s%3N)
RESP=$(curl -s -X POST "$URL_BASE/api/collections/parse-url" -H "Authorization: Bearer dummy" -H "Content-Type: application/json" --data-raw "$BODY" -m 60)
END=$(date +%s%3N)
echo "Duration: $((END-START))ms"
echo "$RESP" | head -c 1500
echo ""
echo ""

# 也用 ts-node 跑一遍，看实际页面状态
echo "=== Test 2: 直接抓取查看实际页面标题 ==="
START=$(date +%s%3N)
cat > /tmp/test-quick.ts <<'EOF'
import { fetchUrlMetadata } from '/opt/linkchest/api/project/apps/api/src/services/metadata'
;(async () => {
  const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'
  const meta = await fetchUrlMetadata(url)
  console.log('title:', meta.title)
  console.log('desc:', (meta.description || '').substring(0, 80))
  console.log('cover:', (meta.coverImage || '').substring(0, 80))
  process.exit(0)
})()
EOF
timeout 60 npx ts-node /tmp/test-quick.ts 2>&1 | tail -20
END=$(date +%s%3N)
echo "Duration: $((END-START))ms"
