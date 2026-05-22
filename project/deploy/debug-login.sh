#!/bin/bash
# 调试登录问题

SERVER_A_IP="43.136.82.88"

echo "=========================================="
echo "  登录问题调试"
echo "=========================================="

echo ""
echo "[1] 测试 /api/auth/login-email (通过Nginx)..."
curl -s -X POST "http://$SERVER_A_IP/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"password"}' \
  -w "\nHTTP状态: %{http_code}\n"

echo ""
echo "[2] 测试直接访问API (3001端口)..."
curl -s -X POST "http://$SERVER_A_IP:3001/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"password"}' \
  -w "\nHTTP状态: %{http_code}\n" | head -c 300

echo ""
echo "[3] 检查Nginx配置中的 /api/ 代理..."
ssh -o StrictHostKeyChecking=no -i /home/mayn/.ssh/linkchest_cn.pem "ubuntu@$SERVER_A_IP" 'sudo grep -A5 "location /api/" /etc/nginx/sites-available/linkchest-cn'

echo ""
echo "[4] 检查manifest.json是否存在..."
ssh -o StrictHostKeyChecking=no -i /home/mayn/.ssh/linkchest_cn.pem "ubuntu@$SERVER_A_IP" 'ls -la /opt/linkchest/web-app/public/manifest.json 2>/dev/null || echo "文件不存在"'

echo ""
echo "[5] 检查logo.png是否存在..."
ssh -o StrictHostKeyChecking=no -i /home/mayn/.ssh/linkchest_cn.pem "ubuntu@$SERVER_A_IP" 'ls -la /opt/linkchest/web-app/public/logo.png 2>/dev/null || echo "文件不存在"; ls -la /opt/linkchest/web-app/public/ 2>/dev/null | head -20'

echo ""
echo "=========================================="
echo "  调试完成"
echo "=========================================="
