#!/bin/bash
# ============================================================
# LinkChest 服务器端一键更新脚本
# 数据库: PostgreSQL (Docker 容器 linkchest-db)
# 服务器结构: /opt/linkchest/api 是 git 仓库根目录
#   API: apps/api/src  (tsx 运行)
#   Web: apps/web      (next build)
#   DB:  PostgreSQL 16 (Docker 容器)
# 使用: bash deploy/update-server.sh
# ============================================================

set -e

BASE_DIR="/opt/linkchest/api"
API_DIR="$BASE_DIR/apps/api"
WEB_DIR="$BASE_DIR/apps/web"

echo "=========================================="
echo "  LinkChest 服务器端更新 (PostgreSQL)"
echo "=========================================="

# ===== 1. 拉取最新代码 =====
echo ""
echo "[1/7] 拉取最新代码..."
cd "$BASE_DIR"
git pull

# ===== 2. 启动 PostgreSQL 容器 =====
echo ""
echo "[2/7] 启动 PostgreSQL 数据库..."
cd "$BASE_DIR"
docker compose up -d postgres
echo "等待 PostgreSQL 就绪..."
sleep 3
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

# ===== 3. 配置 API 环境变量 =====
echo ""
echo "[3/7] 配置 API 环境变量..."
cd "$API_DIR"
if [ ! -f ".env" ] || grep -q "file:" ".env" 2>/dev/null; then
  cp "$BASE_DIR/deploy/.env.production" "$API_DIR/.env"
  echo "  .env 已配置为 PostgreSQL"
else
  echo "  .env 已存在且为 PostgreSQL 配置"
fi

# ===== 4. 数据库迁移 =====
echo ""
echo "[4/7] 数据库迁移..."
cd "$API_DIR"
npx prisma generate

# 先尝试 migrate deploy（适合有 migration 文件的情况）
if ! npx prisma migrate deploy 2>/dev/null; then
  echo "  migrate deploy 失败，使用 db push..."
  npx prisma db push --skip-generate 2>/dev/null || npx prisma db push --accept-data-loss
fi

# V1.4: Schema 校验 - 检查并修复常见缺失字段
echo "  检查 Schema 一致性..."

# 检查并自动添加缺失的列（兼容已有数据库）
check_and_add_column() {
  local table="$1"
  local column="$2"
  local type="$3"
  local default="$4"
  
  if ! docker exec linkchest-db psql -U linkchest -d linkchest -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='$table' AND column_name='$column'" 2>/dev/null | grep -q "$column"; then
    echo "  添加缺失列: $table.$column ($type)"
    local sql="ALTER TABLE \"$table\" ADD COLUMN \"$column\" $type"
    if [ -n "$default" ]; then
      sql="$sql DEFAULT $default"
    fi
    docker exec linkchest-db psql -U linkchest -d linkchest -c "$sql" 2>/dev/null || true
  fi
}

# 检查shares表字段
check_and_add_column "shares" "passwordPlain" "TEXT" "NULL"
check_and_add_column "shares" "description" "TEXT" "NULL"

# 确保schema与Prisma模型一致
npx prisma db push --skip-generate 2>/dev/null || true

echo "数据库迁移完成 ✓"

# ===== 5. 安装 API 依赖 =====
echo ""
echo "[5/7] 安装 API 依赖..."
cd "$API_DIR"
npm install --production 2>/dev/null || true

# ===== 6. 重启 API 服务 =====
echo ""
echo "[6/7] 重启 API 服务..."
# 确保 start-api.sh 有执行权限且无 CRLF
dos2unix "$BASE_DIR/deploy/start-api.sh" 2>/dev/null || sed -i 's/\r$//' "$BASE_DIR/deploy/start-api.sh"
chmod +x "$BASE_DIR/deploy/start-api.sh"
# 删除旧进程并使用 ecosystem.config.js 重建，避免残留错误配置
pm2 delete linkchest-api 2>/dev/null || true
sleep 1
pm2 start "$BASE_DIR/deploy/ecosystem.config.js" --only linkchest-api

# ===== 7. 更新和构建 Web =====
echo ""
echo "[7/7] 更新和构建 Web..."
cd "$WEB_DIR"

# 配置 Web 前端环境变量（NEXT_PUBLIC_* 必须在构建时注入）
echo ""
echo "  配置 Web 前端环境变量..."

# 从 API .env 读取 GOOGLE_CLIENT_ID，转换为前端变量名
GOOGLE_CLIENT_ID=$(grep '^GOOGLE_CLIENT_ID=' "$API_DIR/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'")

# 从 deploy/web-env 读取生产环境 API URL（如存在），否则使用默认值
NEXT_PUBLIC_API_URL="https://linkchest.net/api"
if [ -f "$BASE_DIR/deploy/web-env" ]; then
  WEB_ENV_API_URL=$(grep '^NEXT_PUBLIC_API_URL=' "$BASE_DIR/deploy/web-env" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$WEB_ENV_API_URL" ]; then
    NEXT_PUBLIC_API_URL="$WEB_ENV_API_URL"
  fi
fi

cat > ".env.production" << EOF
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
NEXT_PUBLIC_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
EOF
echo "  Web .env.production 已更新 (API_URL=$NEXT_PUBLIC_API_URL)"

# 回到根目录安装 workspace 依赖，确保 @linkchest/i18n 等包被正确链接
cd "$BASE_DIR"
npm install 2>/dev/null || true
# 编译共享包（main 指向 dist/index.js，必须先构建）
echo "  编译共享包 @linkchest/i18n..."
cd "$BASE_DIR/packages/i18n"
npm run build
cd "$WEB_DIR"

# Web 目录本地依赖（如有）
npm install 2>/dev/null || true

# 清除 Next.js 构建缓存，确保 SWC 重新编译所有文件
rm -rf .next

# 清除所有 .tsx/.ts 文件的 UTF-8 BOM（BOM 会导致 SWC 无法识别 'use client' 指令）
echo "  清除 BOM..."
find src -name '*.tsx' -o -name '*.ts' | while read f; do
  if [ "$(head -c 3 "$f" | xxd -p)" = "efbbbf" ]; then
    echo "    去除 BOM: $f"
    tail -c +4 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  fi
done

# 先构建，再重启 — 减少旧 chunk 被删除但新服务未启动的窗口
npx next build

# 构建成功后先彻底删除旧进程，再全新启动
# 确保 --cwd 配置真正生效，避免旧进程缓存旧的构建路径
echo "  检查构建输出..."
ls -la "$WEB_DIR/.next/" 2>/dev/null || echo "  ⚠️ .next 目录不存在"
ls -la "$WEB_DIR/.next/static/" 2>/dev/null || echo "  ⚠️ static 目录不存在"
ls -la "$WEB_DIR/.next/static/chunks/" 2>/dev/null | head -10 || echo "  ⚠️ chunks 目录不存在"

echo "  重启 Web 服务..."
pm2 delete linkchest-web 2>/dev/null || true
sleep 1

# 确保启动脚本有执行权限，并转换为 Unix 换行符（防止 Windows CRLF 导致无法执行）
dos2unix "$BASE_DIR/deploy/start-api.sh" 2>/dev/null || sed -i 's/\r$//' "$BASE_DIR/deploy/start-api.sh"
dos2unix "$BASE_DIR/deploy/start-web.sh" 2>/dev/null || sed -i 's/\r$//' "$BASE_DIR/deploy/start-web.sh"
chmod +x "$BASE_DIR/deploy/start-api.sh" || true
chmod +x "$BASE_DIR/deploy/start-web.sh" || true

# 使用 ecosystem.config.js 启动（通过 start-web.sh 脚本确保 cwd 正确）
pm2 start "$BASE_DIR/deploy/ecosystem.config.js"

sleep 3
echo "  Web 服务启动状态:"
pm2 status linkchest-web | grep linkchest-web
echo "  PM2 进程详情:"
pm2 show linkchest-web 2>/dev/null | grep -E '(cwd|exec cwd|script|status|pid)' || true

# 验证 Next.js 是否正确找到 .next 目录
echo "  验证 Next.js 服务..."
# 直接检查一个已知存在的 chunk 文件
SAMPLE_CHUNK=$(ls "$WEB_DIR/.next/static/chunks/"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null)
if [ -n "$SAMPLE_CHUNK" ]; then
  # 测试 1: 直接访问 Next.js (localhost:3003)
  DIRECT_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3003/_next/static/chunks/$SAMPLE_CHUNK" 2>/dev/null || echo "000")
  echo "  [直接] http://localhost:3003/_next/static/chunks/$SAMPLE_CHUNK -> HTTP $DIRECT_TEST"
  
  # 测试 2: 通过 Nginx 访问 (localhost:80，会被 301 跳转，用 -L 跟随)
  NGINX_HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:80/_next/static/chunks/$SAMPLE_CHUNK" 2>/dev/null || echo "000")
  echo "  [Nginx HTTP] http://localhost/_next/static/chunks/$SAMPLE_CHUNK -> HTTP $NGINX_HTTP_TEST"
  
  # 测试 3: 通过 Nginx HTTPS 访问 (跳过证书验证)
  NGINX_HTTPS_TEST=$(curl -sk -o /dev/null -w "%{http_code}" "https://localhost:443/_next/static/chunks/$SAMPLE_CHUNK" 2>/dev/null || echo "000")
  echo "  [Nginx HTTPS] https://localhost/_next/static/chunks/$SAMPLE_CHUNK -> HTTP $NGINX_HTTPS_TEST"
  
  # 测试 4: 通过域名访问
  DOMAIN_TEST=$(curl -sk -o /dev/null -w "%{http_code}" "https://linkchest.net/_next/static/chunks/$SAMPLE_CHUNK" 2>/dev/null || echo "000")
  echo "  [域名] https://linkchest.net/_next/static/chunks/$SAMPLE_CHUNK -> HTTP $DOMAIN_TEST"
  
  # 测试 5: 通过 Nginx 但用 Host: localhost
  NGINX_LOCALHOST_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: localhost:3003" "http://127.0.0.1:80/_next/static/chunks/$SAMPLE_CHUNK" 2>/dev/null || echo "000")
  echo "  [Nginx+Host:localhost] -> HTTP $NGINX_LOCALHOST_TEST"
  
  if [ "$DIRECT_TEST" != "200" ]; then
    echo "  ⚠️ Next.js 直接访问失败！检查 PM2 进程 cwd"
    PM2_PID=$(pm2 pid linkchest-web 2>/dev/null)
    if [ -n "$PM2_PID" ] && [ "$PM2_PID" != "0" ]; then
      ls -la /proc/$PM2_PID/cwd 2>/dev/null || echo "    无法读取进程 cwd"
    fi
  elif [ "$NGINX_HTTPS_TEST" != "200" ]; then
    echo "  ⚠️ Nginx 代理层异常！直接访问正常但 Nginx 代理返回非 200"
    echo "  检查 Nginx 配置: cat /etc/nginx/sites-enabled/linkchest"
    echo "  检查 Nginx 错误日志: tail -20 /var/log/nginx/error.log"
  fi
else
  echo "  ⚠️ 未找到 chunk 文件用于测试"
fi

# ===== 同步 Nginx 配置 =====
echo ""
echo "  检查 Nginx 配置..."
if [ -f "$BASE_DIR/deploy/nginx/linkchest.conf" ]; then
  # 对比仓库配置和实际配置
  if ! diff -q "$BASE_DIR/deploy/nginx/linkchest.conf" /etc/nginx/sites-available/linkchest 2>/dev/null; then
    echo "  ⚠️ Nginx 配置有差异，同步中..."
    sudo cp "$BASE_DIR/deploy/nginx/linkchest.conf" /etc/nginx/sites-available/linkchest
    sudo ln -sf /etc/nginx/sites-available/linkchest /etc/nginx/sites-enabled/linkchest
    sudo nginx -t && sudo systemctl reload nginx && echo "  ✅ Nginx 配置已同步并重载"
  else
    echo "  ✅ Nginx 配置一致"
  fi
else
  echo "  ⚠️ 未找到仓库中的 Nginx 配置文件"
fi

# ===== 健康检查 =====
echo ""
echo "=========================================="
echo "  健康检查..."
echo "=========================================="

sleep 3

API_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "FAILED")
# 检查 /login 页面（避免 middleware 307 重定向干扰）
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/login 2>/dev/null || echo "000")
# 检查静态文件是否可正常 serve
STATIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/_next/static/css/ 2>/dev/null || echo "000")

if echo "$API_HEALTH" | grep -q "ok"; then
    echo "✅ API 正常 (http://localhost:3001)"
else
    echo "❌ API 异常 - 检查日志: pm2 logs linkchest-api"
fi

if [ "$WEB_STATUS" = "200" ] || [ "$WEB_STATUS" = "307" ]; then
    echo "✅ Web 服务运行中 (HTTP $WEB_STATUS)"
else
    echo "❌ Web 异常 (HTTP $WEB_STATUS) - 检查日志: pm2 logs linkchest-web"
fi

if [ "$STATIC_STATUS" = "200" ] || [ "$STATIC_STATUS" = "403" ] || [ "$STATIC_STATUS" = "404" ]; then
    echo "✅ 静态文件服务正常 (HTTP $STATIC_STATUS)"
else
    echo "⚠️ 静态文件服务可能异常 (HTTP $STATIC_STATUS)"
fi

pm2 save

echo ""
echo "=========================================="
echo "  部署完成！"
echo ""
echo "  API:  http://localhost:3001"
echo "  Web:  http://localhost:3003"
echo "  数据库: PostgreSQL (linkchest-db)"
echo "  查看服务: pm2 status"
echo "  查看日志: pm2 logs"
echo "  备份命令: docker exec linkchest-db pg_dump -U linkchest linkchest > backup.sql"
echo "=========================================="
