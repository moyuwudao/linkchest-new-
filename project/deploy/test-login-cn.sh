#!/bin/bash
# 测试国内服务器登录功能

SERVER_A_IP="43.136.82.88"

echo "=========================================="
echo "  登录功能测试"
echo "=========================================="

echo ""
echo "[1/5] WEB登录页 (直接访问3002端口)..."
curl -s -o /dev/null -w "HTTP状态: %{http_code}\n" "http://$SERVER_A_IP:3002/login"

echo ""
echo "[2/5] API健康检查 (3001端口)..."
curl -s -o /dev/null -w "HTTP状态: %{http_code}\n" "http://$SERVER_A_IP:3001/health"

echo ""
echo "[3/5] 通过Nginx访问WEB (80端口)..."
curl -s -o /dev/null -w "HTTP状态: %{http_code}\n" -H "Host: linkchest.cn" "http://$SERVER_A_IP/login"

echo ""
echo "[4/5] 通过Nginx访问API (80端口)..."
curl -s -o /dev/null -w "HTTP状态: %{http_code}\n" -H "Host: linkchest.cn" "http://$SERVER_A_IP/api/health"

echo ""
echo "[5/5] 登录接口测试..."
RESPONSE=$(curl -s -X POST "http://$SERVER_A_IP:3001/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"password"}')
echo "响应: $RESPONSE"

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
