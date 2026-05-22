#!/bin/bash
# 管理员模式诊断脚本
# 在服务器上运行：bash deploy/debug-admin.sh

echo "=========================================="
echo "  LinkChest Admin 诊断"
echo "=========================================="
echo ""

API_DIR="/opt/linkchest/api"
API_APP="$API_DIR/apps/api"

# 1. 检查 .env 文件
echo "[1/5] 检查 .env 配置..."
if [ -f "$API_APP/.env" ]; then
  echo "  ✓ .env 文件存在于 $API_APP/.env"
  JWT_SECRET=$(grep '^JWT_SECRET=' "$API_APP/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  ADMIN_IDS=$(grep '^ADMIN_USER_IDS=' "$API_APP/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  NODE_ENV_VAL=$(grep '^NODE_ENV=' "$API_APP/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  echo "  JWT_SECRET: ${JWT_SECRET:0:8}...${JWT_SECRET: -4} (长度: ${#JWT_SECRET})"
  echo "  ADMIN_USER_IDS: $ADMIN_IDS"
  echo "  NODE_ENV: $NODE_ENV_VAL"
else
  echo "  ✗ .env 文件不存在于 $API_APP/.env"
  if [ -f "$API_DIR/.env" ]; then
    echo "  ⚠ 但存在于 $API_DIR/.env (API 不会读取这个路径！)"
  fi
fi
echo ""

# 2. 检查 API 日志中的 adminAuth 信息
echo "[2/5] 检查 API 日志 (最近 30 条 admin 相关)..."
tail -100 /home/ubuntu/.pm2/logs/linkchest-api-out.log 2>/dev/null | grep -i "admin" | tail -30
echo "---"
tail -100 /home/ubuntu/.pm2/logs/linkchest-api-error.log 2>/dev/null | grep -i "admin" | tail -10
echo ""

# 3. 直接测试 /admin/me 端点
echo "[3/5] 测试 /admin/me 端点 (无 token)..."
curl -s -w "\n  HTTP Status: %{http_code}\n" http://localhost:3001/api/admin/me
echo ""

# 4. 查询数据库中的用户信息
echo "[4/5] 查询管理员用户信息..."
docker exec linkchest-db psql -U linkchest -d linkchest -c \
  "SELECT id, email, nickname, provider FROM users WHERE id = '696f9e47-da69-4adb-8834-5324ebcc29db';" 2>/dev/null || \
  echo "  ⚠ 无法查询数据库 (Docker 容器可能未运行或名称不对)"
echo ""

# 5. 检查前端 Web 构建是否包含 admin layout
echo "[5/5] 检查 Web 构建产物..."
if [ -d "$API_DIR/apps/web/.next" ]; then
  echo "  ✓ .next 目录存在"
  # 检查 admin 路由是否在构建中
  ADMIN_ROUTES=$(find "$API_DIR/apps/web/.next" -name "*.js" -path "*admin*" 2>/dev/null | head -5)
  if [ -n "$ADMIN_ROUTES" ]; then
    echo "  ✓ Admin 路由文件存在:"
    echo "$ADMIN_ROUTES" | head -5
  else
    echo "  ✗ 未找到 Admin 路由文件"
  fi
else
  echo "  ✗ .next 目录不存在"
fi
echo ""

echo "=========================================="
echo "  诊断完成"
echo ""
echo "  常见问题："
echo "  1. 如果 ADMIN_USER_IDS 为空，说明 .env 未正确加载"
echo "  2. 如果 JWT_SECRET 与之前签发 token 的密钥不同，token 会验证失败"
echo "  3. 如果数据库查询不到用户，说明 UUID 不匹配"
echo "=========================================="
