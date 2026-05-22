#!/bin/bash
# ============================================================
# LinkChest 一键更新部署脚本
# 在服务器上运行: bash deploy/update.sh
# 拉取最新代码 → 启动PostgreSQL → 数据库迁移 → 重启API → 重建并重启Web
# ============================================================

set -e

API_DIR="/opt/linkchest/api"
API_APP="$API_DIR/apps/api"
WEB_APP="$API_DIR/apps/web"

echo "=========================================="
echo "  LinkChest 一键更新部署"
echo "=========================================="

# 1. 拉取最新代码
echo ""
echo "[1/6] 拉取最新代码..."
cd "$API_DIR"
git pull origin master
echo "代码更新完成 ✓"

# 2. 启动 PostgreSQL 容器
echo ""
echo "[2/6] 启动 PostgreSQL 数据库..."
cd "$API_DIR"
docker compose up -d postgres
echo "等待 PostgreSQL 就绪..."
sleep 3
# 等待 PostgreSQL 完全就绪
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

# 3. 数据库迁移
echo ""
echo "[3/6] 数据库迁移..."
cd "$API_APP"
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate
echo "数据库迁移完成 ✓"

# 4. 安装依赖并重启 API
echo ""
echo "[4/6] 安装依赖并重启 API..."
cd "$API_APP"
npm install 2>/dev/null || true
# API 通过 tsx 直接运行 TS 源码，无需 npm run build
# 确保 start-api.sh 有执行权限且无 Windows CRLF
dos2unix "$API_DIR/deploy/start-api.sh" 2>/dev/null || sed -i 's/\r$//' "$API_DIR/deploy/start-api.sh"
chmod +x "$API_DIR/deploy/start-api.sh"
# 删除旧进程并使用 ecosystem.config.js 重建，避免残留错误配置
npx pm2 delete linkchest-api 2>/dev/null || true
sleep 1
npx pm2 start "$API_DIR/deploy/ecosystem.config.js" --only linkchest-api
echo "API 重启完成 ✓"

# 5. 重建并重启 Web
echo ""
echo "[5/6] 重建 Web 前端..."
cd "$WEB_APP"
npm install 2>/dev/null || true
npx next build
npx pm2 restart linkchest-web 2>/dev/null || npx pm2 start npx --name linkchest-web -- next start -p 3003 -H 0.0.0.0
echo "Web 重建完成 ✓"

# 6. 健康检查
echo ""
echo "[6/6] 健康检查..."
sleep 3

API_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "FAILED")
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 2>/dev/null || echo "000")

if echo "$API_HEALTH" | grep -q "ok"; then
    echo "✅ API 正常 (http://localhost:3001)"
else
    echo "❌ API 异常"
fi

if [ "$WEB_STATUS" = "200" ]; then
    echo "✅ Web 正常 (http://localhost:3003)"
else
    echo "❌ Web 异常 (HTTP $WEB_STATUS)"
fi

npx pm2 save

echo ""
echo "=========================================="
echo "  部署完成！"
echo ""
echo "  数据库: PostgreSQL (linkchest-db)"
echo "  备份命令: docker exec linkchest-db pg_dump -U linkchest linkchest > backup.sql"
echo "=========================================="
