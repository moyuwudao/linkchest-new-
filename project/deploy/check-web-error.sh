#!/bin/bash
# 检查WEB服务错误日志

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"

echo "=========================================="
echo "  检查WEB服务日志"
echo "=========================================="

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" '
echo "--- 最近30行错误日志 ---"
tail -n 30 /home/ubuntu/.pm2/logs/linkchest-web-error.log 2>/dev/null || echo "无错误日志"

echo ""
echo "--- 检查 .env.production 文件 ---"
cat /opt/linkchest/web-app/.env.production 2>/dev/null || echo "文件不存在"

echo ""
echo "--- 检查 next.config.js rewrites配置 ---"
grep -A15 "rewrites" /opt/linkchest/web-app/next.config.js 2>/dev/null || echo "无rewrites配置"
'

echo ""
echo "=========================================="
echo "  完成"
echo "=========================================="
