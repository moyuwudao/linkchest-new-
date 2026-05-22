#!/bin/bash
# 同步next.config.js到服务器并重启

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"
LOCAL_WEB_DIR="/mnt/d/trae_projects/linkchest/project/apps/web"
REMOTE_WEB_DIR="/opt/linkchest/web-app"

echo "=========================================="
echo "  同步next.config.js并重启"
echo "=========================================="

echo "[1/2] 同步 next.config.js..."
rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/next.config.js" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"

echo ""
echo "[2/2] 重启WEB服务..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" "
cd $REMOTE_WEB_DIR
pm2 restart linkchest-web
sleep 3
echo '--- 检查next.config.js是否存在 ---'
ls -la next.config.js

echo ''
echo '--- 测试API代理 ---'
curl -s -o /dev/null -w 'API代理 HTTP %{http_code}\n' 'http://localhost/api/health'
"

echo ""
echo "=========================================="
echo "  完成"
echo "=========================================="
