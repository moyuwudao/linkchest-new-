#!/bin/bash
# 修复WEB服务监听地址，确保监听0.0.0.0

SERVER_A_IP="43.136.82.88"
KEY_PATH="/home/mayn/.ssh/linkchest_cn.pem"

echo "=========================================="
echo "  修复WEB服务监听地址"
echo "=========================================="

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ubuntu@$SERVER_A_IP" '
cd /opt/linkchest/web-app

echo "停止现有WEB服务..."
pm2 delete linkchest-web 2>/dev/null || true

echo ""
echo "创建新的PM2配置（添加 -H 0.0.0.0）..."
cat > ecosystem.config.js << "EOF"
module.exports = {
  apps: [{
    name: "linkchest-web",
    script: "node_modules/.bin/next",
    args: "start -H 0.0.0.0",
    cwd: "/opt/linkchest/web-app",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3002
    },
    max_memory_restart: "1G",
    error_file: "/home/ubuntu/.pm2/logs/linkchest-web-error.log",
    out_file: "/home/ubuntu/.pm2/logs/linkchest-web-out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z"
  }]
};
EOF

echo ""
echo "启动WEB服务..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "等待服务启动..."
sleep 5

echo ""
echo "检查监听端口..."
ss -tlnp | grep 3002

echo ""
echo "PM2状态:"
pm2 status
'

echo ""
echo "测试外部访问3002端口..."
curl -s -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 "http://$SERVER_A_IP:3002/login"

echo ""
echo "=========================================="
echo "  修复完成"
echo "=========================================="
