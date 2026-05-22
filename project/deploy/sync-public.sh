#!/bin/bash
# 同步public静态资源到服务器

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"
LOCAL_WEB_DIR="/mnt/d/trae_projects/linkchest/project/apps/web"
REMOTE_WEB_DIR="/opt/linkchest/web-app"

echo "=========================================="
echo "  同步public静态资源"
echo "=========================================="

echo "[1/2] 同步 public 目录..."
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/public/" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/public/"

echo ""
echo "[2/2] 验证文件..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" "
echo '--- public目录内容 ---'
ls -la $REMOTE_WEB_DIR/public/ | head -20

echo ''
echo '--- 测试manifest.json ---'
curl -s -o /dev/null -w 'HTTP %{http_code}\n' 'http://localhost/manifest.json'

echo ''
echo '--- 测试logo.png ---'
curl -s -o /dev/null -w 'HTTP %{http_code}\n' 'http://localhost/logo.png'
"

echo ""
echo "=========================================="
echo "  同步完成"
echo "=========================================="
