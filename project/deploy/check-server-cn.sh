#!/bin/bash
# 检查服务器配置

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"

echo "=========================================="
echo "  服务器配置检查"
echo "=========================================="

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" '
echo "--- Nginx配置 ---"
sudo nginx -t 2>&1

echo ""
echo "--- Nginx运行状态 ---"
systemctl status nginx --no-pager 2>&1 | head -5

echo ""
echo "--- 监听端口 ---"
ss -tlnp | grep -E "(80|3001|3002)"

echo ""
echo "--- PM2状态 ---"
pm2 status

echo ""
echo "--- WEB服务日志 (最近10行) ---"
tail -n 10 /home/ubuntu/.pm2/logs/linkchest-web-out.log 2>/dev/null || echo "无日志"

echo ""
echo "--- WEB错误日志 (最近10行) ---"
tail -n 10 /home/ubuntu/.pm2/logs/linkchest-web-error.log 2>/dev/null || echo "无错误日志"

echo ""
echo "--- .env.production 内容 ---"
cat /opt/linkchest/web-app/.env.production 2>/dev/null || echo "文件不存在"

echo ""
echo "--- 防火墙状态 ---"
sudo ufw status 2>/dev/null || echo "ufw未启用"
'

echo ""
echo "=========================================="
echo "  外部访问测试"
echo "=========================================="

echo ""
echo "测试80端口..."
curl -s -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 "http://$SERVER_A_IP/"

echo ""
echo "测试3001端口..."
curl -s -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 "http://$SERVER_A_IP:3001/health"

echo ""
echo "测试3002端口..."
curl -s -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 "http://$SERVER_A_IP:3002/"
