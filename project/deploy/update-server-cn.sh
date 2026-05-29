#!/bin/bash
# ============================================================
# LinkChest 国内服务器端一键更新脚本
# 架构: 应用层(43.136.82.88) + 数据层(114.132.81.246)
# 代码来源: GitHub (通过镜像加速)
# 使用: ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && bash deploy/update-server-cn.sh"
# ============================================================

set -e

BASE_DIR="/opt/linkchest/api"
# 统一使用 project/ 下的源码目录，消除双目录不同步问题
SRC_API_DIR="$BASE_DIR/project/apps/api"
SRC_WEB_DIR="$BASE_DIR/project/apps/web"
# 运行目录（与源码目录统一，通过符号链接或直接使用）
API_DIR="$SRC_API_DIR"
WEB_DIR="$SRC_WEB_DIR"
DB_HOST="114.132.81.246"
DB_PORT="5432"
DB_NAME="linkchest"
DB_USER="linkchest"
DB_PASS="LinkChest_DB_2026!"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

PM2_API="linkchest-api"
PM2_WEB="linkchest-web"
GH_MIRROR="https://ghfast.top"

echo "=========================================="
echo "  LinkChest 国内服务器更新"
echo "  应用层: $(hostname -I | awk '{print $1}')"
echo "  数据层: ${DB_HOST}"
echo "=========================================="

# ===== 1. GitHub 镜像加速 =====
echo ""
echo "[1/8] 配置 GitHub 镜像..."
cd "$BASE_DIR"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if echo "$CURRENT_REMOTE" | grep -qE "ghfast\.top|ghproxy\.net|gh-proxy"; then
  echo "  已配置镜像: $CURRENT_REMOTE"
else
  if [ -n "$CURRENT_REMOTE" ]; then
    git remote set-url origin "${GH_MIRROR}/https://github.com/walle404/linkchest.git"
    echo "  已切换为镜像: ${GH_MIRROR}"
  else
    git remote add origin "${GH_MIRROR}/https://github.com/walle404/linkchest.git"
    echo "  已添加镜像 remote"
  fi
fi

# ===== 2. 拉取最新代码 =====
echo ""
echo "[2/8] 拉取最新代码..."
cd "$BASE_DIR"
git pull origin main || git pull origin master

# ===== 3. 安装 API 依赖 + Prisma Generate =====
echo ""
echo "[3/8] 安装 API 依赖..."
cd "$API_DIR"

# 目录同步校验：确保运行目录与源码目录一致
if [ "$API_DIR" != "$SRC_API_DIR" ]; then
  echo "  ⚠️ API 运行目录与源码目录不一致，同步中..."
  cp -rf "$SRC_API_DIR/src" "$API_DIR/" 2>/dev/null || true
  cp -f "$SRC_API_DIR/package.json" "$API_DIR/" 2>/dev/null || true
fi

dos2unix "$BASE_DIR/project/deploy/start-api.sh" 2>/dev/null || sed -i 's/\r$//' "$BASE_DIR/project/deploy/start-api.sh"
dos2unix "$BASE_DIR/project/deploy/start-web.sh" 2>/dev/null || sed -i 's/\r$//' "$BASE_DIR/project/deploy/start-web.sh"
chmod +x "$BASE_DIR/project/deploy/start-api.sh" "$BASE_DIR/project/deploy/start-web.sh"

DATABASE_URL="$DATABASE_URL" npx prisma generate
npm install --production 2>/dev/null || true

# ===== 4. 数据库迁移 =====
echo ""
echo "[4/8] 数据库迁移 (数据层: ${DB_HOST})..."
cd "$API_DIR"

echo "  测试数据库连接..."
if ! nc -zv "$DB_HOST" "$DB_PORT" -w 5 2>/dev/null; then
  echo "  ❌ 无法连接数据层 ${DB_HOST}:${DB_PORT}"
  exit 1
fi
echo "  数据层连接正常 ✓"

DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy 2>/dev/null || {
  echo "  migrate deploy 失败，使用 db push..."
  DATABASE_URL="$DATABASE_URL" npx prisma db push --skip-generate 2>/dev/null || DATABASE_URL="$DATABASE_URL" npx prisma db push --accept-data-loss
}
echo "数据库迁移完成 ✓"

# ===== 4.5 MARKET 环境变量验证 =====
echo ""
echo "[4.5/8] MARKET 环境变量验证..."
if [ -z "$MARKET" ]; then
  echo "  ⚠️ MARKET 未设置，自动设置为 china"
  export MARKET=china
fi
echo "  MARKET=$MARKET ✓"

# ===== 5. 重启 API 服务 =====
echo ""
echo "[5/8] 重启 API 服务..."
cd "$BASE_DIR"
pm2 delete "$PM2_API" 2>/dev/null || true
sleep 1
pm2 start "$BASE_DIR/project/deploy/ecosystem.config.js" --only "$PM2_API" 2>/dev/null || {
  echo "  ecosystem.config.js 中未找到 $PM2_API，使用直接启动..."
  cd "$API_DIR"
  DATABASE_URL="$DATABASE_URL" REDIS_URL="redis://localhost:6379" NODE_ENV=production MARKET=china \
    pm2 start npx --name "$PM2_API" -- tsx src/index.ts
}

# ===== 6. 构建和重启 WEB =====
echo ""
echo "[6/8] 构建 Web 前端..."
cd "$WEB_DIR"

# 优先使用 HTTPS 域名，降级为 IP
NEXT_PUBLIC_API_URL="https://linkchest.cn/api"
if [ -f "$BASE_DIR/deploy/web-env-cn" ]; then
  CN_API_URL=$(grep '^NEXT_PUBLIC_API_URL=' "$BASE_DIR/deploy/web-env-cn" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$CN_API_URL" ]; then
    NEXT_PUBLIC_API_URL="$CN_API_URL"
  fi
fi

GOOGLE_CLIENT_ID=$(grep '^GOOGLE_CLIENT_ID=' "$API_DIR/.env" 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'")
# 读取 WEB 构建所需环境变量（优先 NEXT_PUBLIC_*，兼容旧命名）
WECHAT_CLIENT_ID=$(grep '^WECHAT_CLIENT_ID=' "$API_DIR/.env.china" 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$WECHAT_CLIENT_ID" ]; then
  WECHAT_CLIENT_ID=$(grep '^WECHAT_LOGIN_APPID=' "$API_DIR/.env.china" 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi
ICP_FILING=$(grep '^ICP_FILING=' "$API_DIR/.env.china" 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'")

cat > ".env.production" << EOF
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
NEXT_PUBLIC_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
NEXT_PUBLIC_WECHAT_CLIENT_ID=$WECHAT_CLIENT_ID
NEXT_PUBLIC_ICP_FILING=$ICP_FILING
NEXT_PUBLIC_MARKET=china
EOF
echo "  .env.production: API_URL=$NEXT_PUBLIC_API_URL"

cd "$BASE_DIR"
npm install 2>/dev/null || true
echo "  编译共享包 @linkchest/i18n..."
cd "$BASE_DIR/project/packages/i18n"
npm run build
cd "$WEB_DIR"
npm install 2>/dev/null || true

# 目录同步校验：确保 Web 运行目录与源码目录一致
if [ "$WEB_DIR" != "$SRC_WEB_DIR" ]; then
  echo "  ⚠️ Web 运行目录与源码目录不一致，同步中..."
  cp -rf "$SRC_WEB_DIR/src" "$WEB_DIR/" 2>/dev/null || true
  cp -f "$SRC_WEB_DIR/package.json" "$WEB_DIR/" 2>/dev/null || true
  cp -f "$SRC_WEB_DIR/next.config.*" "$WEB_DIR/" 2>/dev/null || true
fi

rm -rf .next

echo "  清除 BOM..."
find src -name '*.tsx' -o -name '*.ts' | while read f; do
  if [ "$(head -c 3 "$f" | xxd -p)" = "efbbbf" ]; then
    tail -c +4 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  fi
done

echo "  开始构建 Web (超时 10 分钟)..."
timeout 600 npx next build || {
    echo "  ❌ Web 构建失败或超时"
    echo "  检查日志: pm2 logs $PM2_WEB --lines 50 --nostream"
    exit 1
}

echo "  重启 Web 服务..."
pm2 delete "$PM2_WEB" 2>/dev/null || true
sleep 1
pm2 start "$BASE_DIR/project/deploy/ecosystem.config.js" --only "$PM2_WEB" 2>/dev/null || {
  cd "$WEB_DIR"
  NODE_ENV=production pm2 start ./node_modules/.bin/next --name "$PM2_WEB" -- start -p 3003 -H 0.0.0.0
}

sleep 3
echo "  Web 服务状态:"
pm2 status "$PM2_WEB" 2>/dev/null | grep "$PM2_WEB" || pm2 status

# ===== 7. 同步 Nginx 配置 =====
echo ""
echo "[7/8] 检查 Nginx 配置..."
CN_NGINX="$BASE_DIR/deploy/nginx/linkchest-cn.conf"
GLOBAL_NGINX="$BASE_DIR/deploy/nginx/linkchest.conf"
NGINX_SRC=""
if [ -f "$CN_NGINX" ]; then
  NGINX_SRC="$CN_NGINX"
elif [ -f "$GLOBAL_NGINX" ]; then
  NGINX_SRC="$GLOBAL_NGINX"
fi

if [ -n "$NGINX_SRC" ]; then
  if ! diff -q "$NGINX_SRC" /etc/nginx/sites-available/linkchest 2>/dev/null; then
    echo "  Nginx 配置有差异，同步中..."
    sudo cp "$NGINX_SRC" /etc/nginx/sites-available/linkchest
    sudo ln -sf /etc/nginx/sites-available/linkchest /etc/nginx/sites-enabled/linkchest
    sudo nginx -t && sudo systemctl reload nginx && echo "  ✅ Nginx 已同步并重载"
  else
    echo "  ✅ Nginx 配置一致"
  fi
else
  echo "  ⚠️ 未找到 Nginx 配置文件"
fi

# ===== 8. 健康检查 =====
echo ""
echo "=========================================="
echo "  健康检查..."
echo "=========================================="
sleep 3

API_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "FAILED")
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/login 2>/dev/null || echo "000")
DB_CHECK=$(nc -zv "$DB_HOST" "$DB_PORT" -w 3 2>&1 && echo "OK" || echo "FAILED")

if echo "$API_HEALTH" | grep -q "ok"; then
  echo "✅ API 正常 (localhost:3001)"
else
  echo "❌ API 异常 - pm2 logs $PM2_API --lines 50 --nostream"
fi

if [ "$WEB_STATUS" = "200" ] || [ "$WEB_STATUS" = "307" ]; then
  echo "✅ Web 正常 (HTTP $WEB_STATUS)"
else
  echo "❌ Web 异常 (HTTP $WEB_STATUS) - pm2 logs $PM2_WEB --lines 50 --nostream"
fi

if echo "$DB_CHECK" | grep -q "OK"; then
  echo "✅ 数据层连接正常 (${DB_HOST}:${DB_PORT})"
else
  echo "❌ 数据层连接异常"
fi

MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/manifest.json 2>/dev/null || echo "000")
if [ "$MANIFEST_STATUS" = "200" ]; then
  echo "✅ 静态资源正常 (manifest.json)"
else
  echo "⚠️ 静态资源异常 (manifest.json: HTTP $MANIFEST_STATUS)"
fi

pm2 save

echo ""
echo "=========================================="
echo "  部署完成！"
echo ""
echo "  API:  http://43.136.82.88/api (via Nginx)"
echo "  Web:  http://43.136.82.88 (via Nginx)"
echo "  数据层: ${DB_HOST}:${DB_PORT}"
echo "  查看服务: pm2 status"
echo "  查看日志: pm2 logs"
echo "=========================================="
