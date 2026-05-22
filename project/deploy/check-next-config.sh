#!/bin/bash
# 检查服务器上的next.config.js

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"

echo "=========================================="
echo "  检查服务器next.config.js"
echo "=========================================="

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" '
echo "--- 完整next.config.js ---"
cat /opt/linkchest/web-app/next.config.js 2>/dev/null || echo "文件不存在"

echo ""
echo "--- 文件修改时间 ---"
ls -la /opt/linkchest/web-app/next.config.js 2>/dev/null || echo "文件不存在"

echo ""
echo "--- .next目录修改时间 ---"
ls -ld /opt/linkchest/web-app/.next 2>/dev/null || echo "目录不存在"
'

echo ""
echo "=========================================="
echo "  完成"
echo "=========================================="
