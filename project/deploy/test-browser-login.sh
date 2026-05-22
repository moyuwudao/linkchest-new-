#!/bin/bash
# 模拟浏览器登录请求测试

SERVER_A_IP="43.136.82.88"

echo "=========================================="
echo "  模拟浏览器登录请求"
echo "=========================================="

echo ""
echo "[1] 获取登录页Cookie..."
COOKIE=$(curl -s -I "http://$SERVER_A_IP/login" | grep -i "set-cookie" | head -1)
echo "Cookie: $COOKIE"

echo ""
echo "[2] 发送登录请求 (模拟浏览器)..."
RESPONSE=$(curl -s -X POST "http://$SERVER_A_IP/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -H "Origin: http://$SERVER_A_IP" \
  -H "Referer: http://$SERVER_A_IP/login" \
  -d '{"email":"test@linkchest.cn","password":"password","lang":"zh"}')

echo "响应: $RESPONSE"

echo ""
echo "[3] 检查响应是否包含token..."
if echo "$RESPONSE" | grep -q '"token"'; then
    echo "✅ 登录成功，获取到token"
else
    echo "❌ 登录失败"
fi

echo ""
echo "[4] 测试OPTIONS预检请求 (CORS)..."
curl -s -X OPTIONS "http://$SERVER_A_IP/api/auth/login-email" \
  -H "Origin: http://$SERVER_A_IP" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "\nHTTP状态: %{http_code}\n"

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
