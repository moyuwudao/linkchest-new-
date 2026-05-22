#!/bin/bash
# ============================================================
# LinkChest 统一部署脚本
# 支持国内/海外双市场，支持服务器别名
#
# 使用方式:
#   bash deploy/deploy.sh global       # 部署海外版
#   bash deploy/deploy.sh china        # 部署国内版
#   bash deploy/deploy.sh linkchest-global   # 使用服务器别名
#   bash deploy/deploy.sh linkchest-cn-app   # 使用服务器别名
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器配置映射
declare -A SERVER_CONFIG
SERVER_CONFIG["global"]="43.133.44.232"
SERVER_CONFIG["linkchest-global"]="43.133.44.232"
SERVER_CONFIG["linkchest-cn-app"]="43.136.82.88"
SERVER_CONFIG["linkchest-cn-db"]="114.132.81.246"
SERVER_CONFIG["china"]="43.136.82.88"

# 市场类型映射
declare -A MARKET_TYPE
MARKET_TYPE["global"]="global"
MARKET_TYPE["linkchest-global"]="global"
MARKET_TYPE["china"]="china"
MARKET_TYPE["linkchest-cn-app"]="china"
MARKET_TYPE["linkchest-cn-db"]="china"

# PM2 进程名
declare -A PM2_NAME
PM2_NAME["global"]="linkchest-api-global"
PM2_NAME["china"]="linkchest-api-china"

# 解析参数
TARGET="${1:-}"
if [ -z "$TARGET" ]; then
    echo -e "${RED}❌ 请指定部署目标${NC}"
    echo ""
    echo "用法: bash deploy/deploy.sh <目标>"
    echo ""
    echo "可用目标:"
    echo "  global           - 海外服务器 (43.133.44.232)"
    echo "  china            - 国内应用层服务器 (43.136.82.88)"
    echo "  linkchest-global - 海外服务器别名"
    echo "  linkchest-cn-app - 国内应用层服务器别名"
    echo ""
    echo "示例:"
    echo "  bash deploy/deploy.sh global"
    echo "  bash deploy/deploy.sh china"
    exit 1
fi

# 获取服务器 IP 和市场类型
SERVER_IP="${SERVER_CONFIG[$TARGET]}"
MARKET="${MARKET_TYPE[$TARGET]}"

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}❌ 未知部署目标: $TARGET${NC}"
    echo "请使用 'global' 或 'china'"
    exit 1
fi

# 确定 PM2 进程名
PM2_PROCESS="${PM2_NAME[$MARKET]:-linkchest-api}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LinkChest 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "目标服务器: ${YELLOW}${SERVER_IP}${NC}"
echo -e "市场类型:   ${YELLOW}${MARKET}${NC}"
echo -e "PM2 进程:   ${YELLOW}${PM2_PROCESS}${NC}"
echo ""

# 项目路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_DIR="/opt/linkchest/api"

# 1. 检查本地环境
echo -e "[1/6] ${GREEN}检查本地环境...${NC}"
if [ ! -d "$PROJECT_ROOT/apps/api" ]; then
    echo -e "${RED}❌ 错误: 找不到 API 目录${NC}"
    exit 1
fi

# 检查环境变量文件
ENV_FILE="$PROJECT_ROOT/apps/api/.env.${MARKET}"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 错误: 找不到环境变量文件: $ENV_FILE${NC}"
    exit 1
fi
echo "✓ 环境检查完成"

# 2. 测试 SSH 连接
echo ""
echo -e "[2/6] ${GREEN}测试 SSH 连接...${NC}"
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} "echo OK" 2>/dev/null | grep -q "OK"; then
    echo -e "${RED}❌ SSH 连接失败，请检查: ssh ubuntu@${SERVER_IP}${NC}"
    exit 1
fi
echo "✓ SSH 连接正常"

# 3. 同步代码到服务器
echo ""
echo -e "[3/6] ${GREEN}同步代码到服务器...${NC}"
echo "  同步以下目录:"
echo "    - apps/api/ (源码)"
echo "    - apps/web/ (前端)"
echo "    - deploy/ (部署脚本)"

rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='dist' \
    --exclude='.turbo' --exclude='*.log' \
    -e "ssh -o StrictHostKeyChecking=accept-new" \
    "$PROJECT_ROOT/" \
    "ubuntu@${SERVER_IP}:${REMOTE_DIR}/"

# 同步环境变量文件
scp -o StrictHostKeyChecking=accept-new \
    "$ENV_FILE" \
    "ubuntu@${SERVER_IP}:${REMOTE_DIR}/.env"

echo "✓ 代码同步完成"

# 4. 服务器端依赖安装
echo ""
echo -e "[4/6] ${GREEN}服务器端安装依赖...${NC}"
ssh -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} << 'ENDSSH'
cd /opt/linkchest/api

# 安装 API 依赖
cd apps/api
npm install --production

# 生成 Prisma Client
npx prisma generate

# 同步 PM2 进程名
if grep -q "linkchest-api-global" /opt/linkchest/api/deploy/ecosystem.config.js 2>/dev/null; then
    PM2_NAME="linkchest-api-global"
elif grep -q "linkchest-api-china" /opt/linkchest/api/deploy/ecosystem.config.js 2>/dev/null; then
    PM2_NAME="linkchest-api-china"
else
    PM2_NAME="linkchest-api"
fi

echo "PM2 进程名: $PM2_NAME"
ENDSSH
echo "✓ 依赖安装完成"

# 5. 数据库迁移（仅国内需要单独迁移数据库到服务器B）
echo ""
echo -e "[5/6] ${GREEN}数据库迁移...${NC}"
if [ "$MARKET" == "china" ]; then
    echo "  国内市场：数据库在服务器B (114.132.81.246)"
    ssh -o StrictHostKeyChecking=accept-new ubuntu@114.132.81.246 << 'ENDSSH'
cd /opt/linkchest/api/apps/api
npx prisma migrate deploy
ENDSSH
    echo "✓ 数据库迁移完成"
else
    echo "  海外市场：数据库在本地容器，无需额外迁移"
fi

# 6. 重启服务（使用 restart 而不是 delete）
echo ""
echo -e "[6/6] ${GREEN}重启服务...${NC}"
ssh -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} << ENDSSH
cd /opt/linkchest/api

# 确保脚本有执行权限
chmod +x deploy/start-api.sh deploy/start-web.sh

# 重启 PM2 服务（使用 restart 而不是 delete）
pm2 restart deploy/ecosystem.config.js --update-env

# 保存进程列表
pm2 save

# 显示状态
pm2 status
ENDSSH
echo "✓ 服务重启完成"

# 健康检查
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "API 地址:    ${YELLOW}http://${SERVER_IP}:3001${NC}"
echo -e "健康检查:    ${YELLOW}http://${SERVER_IP}:3001/health${NC}"
echo ""
echo -e "${GREEN}常用命令:${NC}"
echo "  查看状态: ssh ubuntu@${SERVER_IP} 'pm2 status'"
echo "  查看日志: ssh ubuntu@${SERVER_IP} 'pm2 logs linkchest-api'"
echo "  重启服务: ssh ubuntu@${SERVER_IP} 'pm2 restart all'"
echo ""
