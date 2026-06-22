#!/bin/bash
# 登录后调用 API 测试
TOKEN_JSON=$(curl -sS -X POST 'http://127.0.0.1:3001/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@linkchest.com","password":"Test1234!"}' 2>/dev/null)
echo "Login: $TOKEN_JSON" | head -c 300
echo
TOKEN=$(echo $TOKEN_JSON | python3 -c "import sys, json; print(json.load(sys.stdin).get('token',''))")
if [ -z "$TOKEN" ]; then
  echo "Login failed, can't test via API"
  exit 1
fi

for URL in \
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157' \
  'https://www.xiaohongshu.com/explore/6a1a90d50000000035022684' \
  'https://www.xiaohongshu.com/explore/6a27d536000000002202e62a'; do
  echo
  echo "=== Testing: $URL ==="
  curl -sS -X POST 'http://127.0.0.1:3001/api/collections/parse-url' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"url\":\"$URL\"}" --max-time 60 | head -c 600
  echo
done
