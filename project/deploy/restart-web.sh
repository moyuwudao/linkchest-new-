#!/bin/bash
# 重启WEB服务并测试静态资源

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"

echo "=========================================="
echo "  重启WEB服务"
echo "=========================================="

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" '
echo "重启WEB服务..."
pm2 restart linkchest-web
sleep 3

echo ""
echo "--- 测试静态资源 ---"
curl -s -o /dev/null -w "manifest.json: HTTP %{http_code}\n" "http://localhost/manifest.json"
curl -s -o /dev/null -w "logo.png: HTTP %{http_code}\n" "http://localhost/logo.png"
curl -s -o /dev/null -w "favicon.ico: HTTP %{http_code}\n" "http://localhost/favicon.ico"
'

echo ""
echo "--- 外部测试 ---"
curl -s -o /dev/null -w "manifest.json: HTTP %{http_code}\n" "http://$SERVER_A_IP/manifest.json"
curl -s -o /dev/null -w "logo.png: HTTP %{http_code}\n" "http://$SERVER_A_IP/logo.png"

echo ""
echo "=========================================="
echo "  完成"
echo "=========================================="
