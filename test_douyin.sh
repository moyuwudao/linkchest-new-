#!/bin/bash
# 1. 登录获取 token
echo "===== 登录 ====="
LOGIN_RES=$(curl -s -X POST http://43.136.82.88:3001/api/auth/login-email \
  -H 'Content-Type: application/json' \
  --data '{"email":"test@linkchest.net","password":"Test123456!"}')
echo "$LOGIN_RES" | head -c 200
echo ""

TOKEN=$(echo "$LOGIN_RES" | grep -oP '"token":"[^"]+"' | sed 's/"token":"//;s/"$//')
if [ -z "$TOKEN" ]; then
  echo "FAIL: 没拿到 token"
  exit 1
fi
echo "TOKEN=${TOKEN:0:30}..."

# 2. 测试 /smart-parse（移动端用）
echo ""
echo "===== /smart-parse（移动端用） ====="
SMART_RES=$(curl -s -X POST http://43.136.82.88:3001/api/collections/smart-parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data '{"input":"https://www.douyin.com/video/7627360395912662306?previous_page=app_code_link"}')
echo "$SMART_RES" | head -c 1500
echo ""

# 3. 测试 /parse-url（WEB端用）
echo ""
echo "===== /parse-url（WEB端用） ====="
PARSE_RES=$(curl -s -X POST http://43.136.82.88:3001/api/collections/parse-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data '{"url":"https://www.douyin.com/video/7627360395912662306?previous_page=app_code_link"}')
echo "$PARSE_RES" | head -c 1500
echo ""
