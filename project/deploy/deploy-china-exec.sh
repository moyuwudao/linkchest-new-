#!/bin/bash
set -e
SERVER_A_IP='43.136.82.88'
SERVER_B_IP='114.132.81.246'
KEY_PATH='/home/mayn/.ssh/linkchest_cn.pem'
REMOTE_DIR='/opt/linkchest/api'
LOCAL_PROJECT_DIR='/mnt/d/trae_projects/linkchest'

SSH_CMD="ssh -o StrictHostKeyChecking=no -i $KEY_PATH"
SCP_CMD="scp -o StrictHostKeyChecking=no -i $KEY_PATH"

echo '=========================================='
echo '  LinkChest 国内部署'
echo '=========================================='
echo "应用服务器: $SERVER_A_IP"
echo "数据库服务器: $SERVER_B_IP"
echo ''

echo '[1/6] 修复服务器A目录权限...'
$SSH_CMD ubuntu@$SERVER_A_IP "sudo chown -R ubuntu:ubuntu /opt/linkchest"

echo ''
echo '[2/6] 同步API代码到服务器A...'
$SSH_CMD ubuntu@$SERVER_A_IP "mkdir -p $REMOTE_DIR"

rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='dist' \
  --exclude='.env' \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_PROJECT_DIR/apps/api/" \
  "ubuntu@$SERVER_A_IP:$REMOTE_DIR/apps/api/"

rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_PROJECT_DIR/package.json" \
  "ubuntu@$SERVER_A_IP:$REMOTE_DIR/"

rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_PROJECT_DIR/apps/api/prisma/" \
  "ubuntu@$SERVER_A_IP:$REMOTE_DIR/apps/api/prisma/"

echo '代码同步完成'

echo ''
echo '[3/6] 同步部署脚本...'
$SCP_CMD "$LOCAL_PROJECT_DIR/deploy/ecosystem.config.js" "ubuntu@$SERVER_A_IP:$REMOTE_DIR/deploy/"
$SCP_CMD "$LOCAL_PROJECT_DIR/deploy/start-api.sh" "ubuntu@$SERVER_A_IP:$REMOTE_DIR/deploy/"
$SCP_CMD "$LOCAL_PROJECT_DIR/deploy/start-web.sh" "ubuntu@$SERVER_A_IP:$REMOTE_DIR/deploy/"

echo ''
echo '[4/6] 安装依赖...'
$SSH_CMD ubuntu@$SERVER_A_IP << 'ENDSSH'
cd /opt/linkchest/api/apps/api
npm install --production
npx prisma generate
echo '依赖安装完成'
ENDSSH

echo ''
echo '[5/6] 配置环境变量...'
$SSH_CMD ubuntu@$SERVER_A_IP "cat > /opt/linkchest/api/apps/api/.env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://linkchest:LinkChest_DB_2026!@114.132.81.246:5432/linkchest
REDIS_URL=redis://localhost:6379
PORT=3001
MARKET=china
EOF"

echo ''
echo '[6/6] 启动服务...'
$SSH_CMD ubuntu@$SERVER_A_IP << 'ENDSSH'
cd /opt/linkchest/api
chmod +x deploy/start-api.sh deploy/start-web.sh
pm2 delete linkchest-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.js --only linkchest-api
pm2 save
echo '服务启动完成'
ENDSSH

echo ''
echo '[7/6] 健康检查...'
sleep 3
HEALTH=$(curl -s "http://$SERVER_A_IP:3001/health" 2>/dev/null || echo 'FAILED')
if echo "$HEALTH" | grep -q 'ok'; then
    echo 'API 服务运行正常！'
else
    echo '健康检查未通过，请查看日志'
fi

echo ''
echo '=========================================='
echo '  部署完成！'
echo '=========================================='