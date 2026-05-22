#!/bin/bash
# ============================================================
# LinkChest API 一键服务器端部署脚本
# 直接在服务器 WebShell 中粘贴执行
# 数据库: PostgreSQL (Docker 容器)
# ============================================================
set -e

cd /opt/linkchest/api

echo "=========================================="
echo "  LinkChest API 服务器端部署 (PostgreSQL)"
echo "=========================================="

# 1. 启动 PostgreSQL 容器
echo "[1/5] 启动 PostgreSQL..."
docker compose up -d postgres
echo "等待 PostgreSQL 就绪..."
sleep 5
for i in {1..30}; do
  if docker exec linkchest-db pg_isready -U linkchest > /dev/null 2>&1; then
    echo "PostgreSQL 就绪 ✓"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL 启动超时"
    exit 1
  fi
  sleep 1
done

# 2. 配置环境变量
echo ""
echo "[2/5] 配置环境变量..."
cd /opt/linkchest/api/apps/api
if [ ! -f ".env" ]; then
  cp /opt/linkchest/api/deploy/.env.production .env
  echo "已复制生产环境配置 ✓"
else
  echo ".env 文件已存在"
fi

# 3. 安装依赖
echo ""
echo "[3/5] 安装依赖..."
npm install --production

# 4. 生成 Prisma Client
echo ""
echo "[4/5] 生成 Prisma Client..."
npx prisma generate

# 5. 数据库迁移
echo ""
echo "[5/5] 数据库迁移..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate

echo ""
echo "=========================================="
echo "  部署完成！"
echo ""
echo "  启动 API: NODE_ENV=production pm2 start npx --name linkchest-api -- tsx src/index.ts"
echo "  备份命令: docker exec linkchest-db pg_dump -U linkchest linkchest > backup.sql"
echo "=========================================="
