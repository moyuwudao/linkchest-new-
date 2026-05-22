#!/bin/bash
# 同步WEB构建产物到服务器并重启服务

set -e

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"
LOCAL_WEB_DIR="/mnt/d/trae_projects/linkchest/project/apps/web"
REMOTE_WEB_DIR="/opt/linkchest/web-app"

echo "=========================================="
echo "  同步WEB构建产物到服务器"
echo "=========================================="

echo "[1/4] 同步 .next 构建产物..."
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/.next/" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/.next/"

echo "[2/4] 同步 package.json..."
rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/package.json" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"

echo "[3/4] 同步 .env.production..."
rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/.env.production" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"

echo "[4/4] 重启WEB服务..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" "
cd $REMOTE_WEB_DIR
pm2 delete linkchest-web 2>/dev/null || true
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'linkchest-web',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/opt/linkchest/web-app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/.pm2/logs/linkchest-web-error.log',
    out_file: '/home/ubuntu/.pm2/logs/linkchest-web-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
npm install --production
pm2 start ecosystem.config.js
pm2 save
echo 'WEB服务重启完成'
pm2 status
"

echo ""
echo "=========================================="
echo "  同步完成！"
echo "=========================================="
echo ""
echo "等待服务启动..."
sleep 5

# 健康检查
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_A_IP:3002/login" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ WEB服务运行正常 (HTTP 200)"
else
    echo "⚠️ WEB服务返回 HTTP $HTTP_CODE"
fi

echo ""
echo "访问地址: http://$SERVER_A_IP"
