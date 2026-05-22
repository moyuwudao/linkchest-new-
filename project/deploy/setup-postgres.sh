#!/bin/bash
# ============================================================
# LinkChest PostgreSQL 首次部署/迁移脚本
# 在服务器上运行: bash deploy/setup-postgres.sh
# 用于首次从 SQLite 迁移到 PostgreSQL，或在新服务器上初始化
# ============================================================

set -e

API_DIR="/opt/linkchest/api"
API_APP="$API_DIR/apps/api"

echo "=========================================="
echo "  LinkChest PostgreSQL 初始化"
echo "=========================================="

# 1. 确保 Docker 已安装
echo ""
echo "[1/5] 检查 Docker..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker 未安装，请先安装 Docker"
  echo "  curl -fsSL https://get.docker.com | sh"
  exit 1
fi
echo "Docker 已安装 ✓"

# 2. 启动 PostgreSQL 容器
echo ""
echo "[2/5] 启动 PostgreSQL 容器..."
cd "$API_DIR"
docker compose up -d postgres
echo "等待 PostgreSQL 就绪..."
sleep 5

# 等待 PostgreSQL 完全就绪
for i in {1..30}; do
  if docker exec linkchest-db pg_isready -U linkchest > /dev/null 2>&1; then
    echo "PostgreSQL 就绪 ✓"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL 启动超时"
    docker logs linkchest-db
    exit 1
  fi
  sleep 1
done

# 3. 复制环境配置
echo ""
echo "[3/5] 配置环境变量..."
if [ ! -f "$API_APP/.env" ]; then
  cp "$API_DIR/deploy/.env.production" "$API_APP/.env"
  echo "已复制生产环境配置 ✓"
else
  echo ".env 文件已存在，跳过（如需更新请手动修改 DATABASE_URL）"
  # 检查是否还在使用 SQLite
  if grep -q "file:" "$API_APP/.env"; then
    echo "⚠️  检测到 .env 仍在使用 SQLite，正在更新..."
    DB_PASSWORD="${DB_PASSWORD:-changeme}"
    sed -i "s|DATABASE_URL=\"file:.*\"|DATABASE_URL=\"postgresql://linkchest:${DB_PASSWORD}@localhost:5432/linkchest?schema=public\"|" "$API_APP/.env"
    echo "已更新 DATABASE_URL ✓"
  fi
fi

# 4. 安装依赖并生成 Prisma Client
echo ""
echo "[4/5] 安装依赖并生成 Prisma Client..."
cd "$API_APP"
npm install
npx prisma generate

# 5. 执行数据库迁移
echo ""
echo "[5/5] 执行数据库迁移..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate
echo "数据库迁移完成 ✓"

# 完成
echo ""
echo "=========================================="
echo "  PostgreSQL 初始化完成！"
echo ""
echo "  连接信息:"
echo "    Host: localhost (容器间用 postgres)"
echo "    Port: 5432"
echo "    User: linkchest"
echo "    DB:   linkchest"
echo ""
echo "  备份命令:"
echo "    docker exec linkchest-db pg_dump -U linkchest linkchest > backup.sql"
echo ""
echo "  定时备份 (crontab -e):"
echo "    0 3 * * * /opt/linkchest/api/deploy/backup-db.sh"
echo "=========================================="
