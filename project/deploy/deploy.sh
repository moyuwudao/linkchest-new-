#!/bin/bash
# ============================================================
# LinkChest API 部署脚本
# 支持国内/海外双市场部署
# 使用: bash deploy/deploy.sh [服务器IP] [市场类型]
# 市场类型: global (海外) | china (国内)
# ============================================================

set -e

# 服务器配置
if [ -z "$1" ] && [ -z "$DEPLOY_SERVER_IP" ]; then
    echo "❌ 请提供服务器IP作为参数，或设置 DEPLOY_SERVER_IP 环境变量"
    echo "用法: bash deploy/deploy.sh <服务器IP> [global|china]"
    exit 1
fi
SERVER_IP="${1:-$DEPLOY_SERVER_IP}"
MARKET_TYPE="${2:-$DEPLOY_MARKET_TYPE:-global}"
SERVER_USER="${DEPLOY_SERVER_USER:-root}"
REMOTE_DIR="/opt/linkchest/api"
LOCAL_API_DIR="$(cd "$(dirname "$0")/../apps/api" && pwd)"

# 验证市场类型
if [ "$MARKET_TYPE" != "global" ] && [ "$MARKET_TYPE" != "china" ]; then
    echo "❌ 无效的市场类型: $MARKET_TYPE"
    echo "有效选项: global (海外) | china (国内)"
    exit 1
fi

echo "=========================================="
echo "  LinkChest API 部署"
echo "=========================================="
echo "服务器: ${SERVER_IP}"
echo "市场类型: ${MARKET_TYPE}"
echo "本地目录: ${LOCAL_API_DIR}"
echo "远程目录: ${REMOTE_DIR}"
echo ""

# 1. 本地构建（API 通过 tsx 运行 TS 源码，无需本地构建）
echo "[1/5] 检查项目..."
cd "${LOCAL_API_DIR}"
echo "项目检查完成 ✓"

# 2. 同步文件到服务器
echo ""
echo "[2/5] 同步文件到服务器..."
scp -r \
  "${LOCAL_API_DIR}/dist/" \
  "${LOCAL_API_DIR}/package.json" \
  "${LOCAL_API_DIR}/tsconfig.json" \
  "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/"

scp -r "${LOCAL_API_DIR}/prisma/" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/prisma/"

# 根据市场类型选择环境变量文件
ENV_FILE="${LOCAL_API_DIR}/../.env.${MARKET_TYPE}"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="${LOCAL_API_DIR}/../.env.production"
fi

scp "$ENV_FILE" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/.env" 2>/dev/null || \
  scp "$(dirname "$0")/.env.${MARKET_TYPE}" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/.env" 2>/dev/null || \
  scp "$(dirname "$0")/.env.production" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/.env" 2>/dev/null || \
  echo "⚠ 未找到环境变量文件，请手动配置"

echo "文件同步完成 ✓"

# 3. 服务器端安装依赖和初始化数据库
echo ""
echo "[3/5] 服务器端安装依赖..."
ssh "${SERVER_USER}@${SERVER_IP}" << 'ENDSSH'
cd /opt/linkchest/api
npm install --production
npx prisma generate
npx prisma db push --skip-generate
ENDSSH
echo "依赖安装完成 ✓"

# 4. 启动/重启服务
echo ""
echo "[4/5] 启动服务..."
ssh "${SERVER_USER}@${SERVER_IP}" << ENDSSH
cd /opt/linkchest/api

# 确保 start-api.sh 有执行权限且无 CRLF
dos2unix deploy/start-api.sh deploy/start-web.sh 2>/dev/null || sed -i 's/\r$//' deploy/start-api.sh deploy/start-web.sh
chmod +x deploy/start-api.sh deploy/start-web.sh

pm2 delete linkchest-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.js --only linkchest-api

pm2 save
ENDSSH
echo "服务启动完成 ✓"

# 5. 健康检查
echo ""
echo "[5/5] 健康检查..."
sleep 3
HEALTH=$(curl -s "http://${SERVER_IP}:3001/health" 2>/dev/null || echo "FAILED")
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ API 服务运行正常！"
    echo "   健康检查: http://${SERVER_IP}:3001/health"
else
    echo "❌ 健康检查失败，请查看服务器日志:"
    echo "   ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs linkchest-api'"
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "API 地址: http://${SERVER_IP}:3001"
echo "健康检查: http://${SERVER_IP}:3001/health"
echo ""
echo "常用命令:"
echo "  查看日志: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs linkchest-api'"
echo "  重启服务: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 restart linkchest-api'"
echo "  查看状态: ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'"
echo ""
