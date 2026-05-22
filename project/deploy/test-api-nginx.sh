#!/bin/bash
# 测试API访问

SERVER_A_IP="43.136.82.88"

echo "=========================================="
echo "  测试API访问"
echo "=========================================="

echo ""
echo "[1] 通过Nginx访问API..."
curl -s -X POST "http://$SERVER_A_IP/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -H "Origin: http://$SERVER_A_IP" \
  -d '{"email":"test@linkchest.cn","password":"password"}' \
  -w "\nHTTP状态: %{http_code}\n" | head -c 300

echo ""
echo "[2] 直接访问API (3001端口)..."
curl -s -X POST "http://$SERVER_A_IP:3001/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"password"}' \
  -w "\nHTTP状态: %{http_code}\n" | head -c 300

echo ""
echo "=========================================="
echo "  完成"
echo "=========================================="
