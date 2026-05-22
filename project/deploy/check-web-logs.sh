#!/bin/bash
# 检查WEB服务日志

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"

echo "=========================================="
echo "  检查WEB服务日志"
echo "=========================================="

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" '
echo "--- PM2状态 ---"
pm2 status

echo ""
echo "--- 最近20行输出日志 ---"
tail -n 20 /home/ubuntu/.pm2/logs/linkchest-web-out.log 2>/dev/null || echo "无输出日志"

echo ""
echo "--- 最近20行错误日志 ---"
tail -n 20 /home/ubuntu/.pm2/logs/linkchest-web-error.log 2>/dev/null || echo "无错误日志"

echo ""
echo "--- Nginx访问日志 (最近10条 /api 请求) ---"
sudo tail -n 20 /var/log/nginx/access.log 2>/dev/null | grep -E "(POST|GET).*api" | tail -10 || echo "无API请求日志"

echo ""
echo "--- Nginx错误日志 ---"
sudo tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "无错误日志"
'

echo ""
echo "=========================================="
echo "  测试登录请求"
echo "=========================================="

echo ""
echo "发送登录请求到Nginx..."
curl -s -X POST "http://$SERVER_A_IP/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -H "Origin: http://$SERVER_A_IP" \
  -d '{"email":"test@linkchest.cn","password":"password"}' \
  -w "\nHTTP状态: %{http_code}\n" | head -c 300
