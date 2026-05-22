#!/bin/bash
# ============================================================
# LinkChest Web 国内部署脚本
# 服务器A: 43.136.82.88
# ============================================================

set -e

SERVER_A_IP="43.136.82.88"
KEY_PATH="/mnt/d/trae_projects/linkchest/deploy/linkchest_cn.pem"
LOCAL_WEB_DIR="/mnt/d/trae_projects/linkchest/project/apps/web"
REMOTE_WEB_DIR="/opt/linkchest/web-app"

echo "=========================================="
echo "  LinkChest Web 国内部署"
echo "=========================================="

# 1. 本地构建
echo "[1/5] 本地构建WEB项目..."
cd "$LOCAL_WEB_DIR"

# 设置环境变量（NEXT_PUBLIC_* 必须在构建前设置）
export NEXT_PUBLIC_API_URL="/api"
export NODE_ENV=production

# 创建 .env.production 文件（确保构建时读取）
echo "NEXT_PUBLIC_API_URL=/api" > .env.production

# 安装依赖并构建
npm install
npm run build

echo "构建完成 ✓"

# 同步构建产物到服务器
echo ""
echo "[2/5] 同步构建产物到服务器..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@$SERVER_A_IP "mkdir -p $REMOTE_WEB_DIR"

# 同步.next目录
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/.next/" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/.next/"

# 同步package.json和必要文件
rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/package.json" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"

# 同步 .env.production 文件
rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
  "$LOCAL_WEB_DIR/.env.production" \
  "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"

echo "同步完成 ✓"

# 3. 服务器上安装依赖
echo ""
echo "[3/5] 服务器上安装依赖..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@$SERVER_A_IP "
cd $REMOTE_WEB_DIR
npm install --production
"

echo "依赖安装完成 ✓"

# 4. 配置PM2启动WEB服务
echo ""
echo "[4/5] 配置PM2启动WEB服务..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@$SERVER_A_IP "
cd $REMOTE_WEB_DIR

# 创建PM2配置
cat > ecosystem.config.js <> 'EOF'
module.exports = {
  apps: [{
    name: 'linkchest-web',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '$REMOTE_WEB_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
      // NEXT_PUBLIC_* 已在构建时注入，运行时无需重复设置
    },
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/.pm2/logs/linkchest-web-error.log',
    out_file: '/home/ubuntu/.pm2/logs/linkchest-web-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# 启动服务
pm2 delete linkchest-web 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo 'WEB服务启动完成'
"

echo "WEB服务配置完成 ✓"

# 5. 更新Nginx配置
echo ""
echo "[5/5] 更新Nginx配置..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@$SERVER_A_IP "sudo tee /etc/nginx/sites-available/linkchest-cn > /dev/null <> 'EOF'
server {
    listen 80;
    server_name linkchest.cn www.linkchest.cn;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    location /s/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }
}
EOF
sudo nginx -t && sudo systemctl restart nginx
"

echo "Nginx配置完成 ✓"

# 6. 健康检查
echo ""
echo "[6/5] 健康检查..."
sleep 5
HEALTH=$(curl -s "http://$SERVER_A_IP:3002" 2>/dev/null | head -1 || echo "FAILED")
if echo "$HEALTH" | grep -q "DOCTYPE\|html"; then
    echo "✅ WEB服务运行正常！"
else
    echo "⚠️ WEB服务可能未完全启动"
fi

echo ""
echo "=========================================="
echo "  Web部署完成！"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  Web页面: http://$SERVER_A_IP"
echo "  API接口: http://$SERVER_A_IP/api"
echo ""
