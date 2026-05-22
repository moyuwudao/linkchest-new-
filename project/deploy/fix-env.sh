#!/bin/bash
# 配置环境变量并启动服务

cd /opt/linkchest/api/apps/api

# 生成JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)

# 创建.env文件
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://linkchest:LinkChest_DB_2026!@114.132.81.246:5432/linkchest
REDIS_URL=redis://localhost:6379
PORT=3001
EOF

# 追加JWT_SECRET
echo "JWT_SECRET=$JWT_SECRET" >> .env

echo "环境变量配置完成:"
cat .env

# 启动服务
cd /opt/linkchest/api
pm2 start deploy/ecosystem.config.js --only linkchest-api
pm2 save

echo "服务已启动"
pm2 status
