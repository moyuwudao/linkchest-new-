#!/bin/bash
# LinkChest 服务器清理脚本
# 警告: 此脚本会删除数据！请先运行 check-storage.sh 确认！
# 用法: bash deploy/cleanup-server.sh

set -e

PROJECT_DIR="/opt/linkchest"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}==========================================${NC}"
echo -e "${RED}  ⚠️  LinkChest 服务器清理脚本${NC}"
echo -e "${RED}==========================================${NC}"
echo ""
echo "此脚本将删除以下内容:"
echo "  1. Docker 中未使用的容器、镜像、卷、网络"
echo "  2. 项目目录中的旧备份文件 (*.bak, *.backup, *.old, *.tar.gz)"
echo "  3. PM2 日志文件"
echo "  4. 系统临时文件（超过7天的）"
echo "  5. npm/pnpm 缓存"
echo ""
read -p "确定要继续吗? (输入 YES 确认): " confirm
if [ "$confirm" != "YES" ]; then
  echo "已取消"
  exit 0
fi

echo ""
echo "=========================================="
echo "  开始清理..."
echo "=========================================="
echo ""

# 1. 停止并删除旧的 Docker 容器
echo -e "${YELLOW}[1/8] 清理 Docker 未使用资源...${NC}"
docker system prune -af --volumes 2>/dev/null || true
echo -e "${GREEN}  ✓ Docker 清理完成${NC}"
echo ""

# 2. 删除项目中的旧备份文件
echo -e "${YELLOW}[2/8] 删除旧备份文件...${NC}"
if [ -d "$PROJECT_DIR" ]; then
  find "$PROJECT_DIR" -name "*.backup" -type f -delete 2>/dev/null || true
  find "$PROJECT_DIR" -name "*.bak" -type f -delete 2>/dev/null || true
  find "$PROJECT_DIR" -name "*.old" -type f -delete 2>/dev/null || true
  find "$PROJECT_DIR" -name "*.tar.gz" -type f -delete 2>/dev/null || true
  find "$PROJECT_DIR" -name "*.zip" -type f -delete 2>/dev/null || true
  echo -e "${GREEN}  ✓ 备份文件清理完成${NC}"
else
  echo "  项目目录不存在，跳过"
fi
echo ""

# 3. 清理 PM2 日志
echo -e "${YELLOW}[3/8] 清理 PM2 日志...${NC}"
PM2_LOG_DIR="$HOME/.pm2/logs"
if [ -d "$PM2_LOG_DIR" ]; then
  rm -f "$PM2_LOG_DIR"/linkchest-* 2>/dev/null || true
  pm2 flush linkchest-api 2>/dev/null || true
  pm2 flush linkchest-web 2>/dev/null || true
  echo -e "${GREEN}  ✓ PM2 日志清理完成${NC}"
else
  echo "  PM2 日志目录不存在，跳过"
fi
echo ""

# 4. 清理系统临时文件
echo -e "${YELLOW}[4/8] 清理系统临时文件...${NC}"
find /tmp -type f -mtime +7 -delete 2>/dev/null || true
find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ 临时文件清理完成${NC}"
echo ""

# 5. 清理 npm 缓存
echo -e "${YELLOW}[5/8] 清理 npm 缓存...${NC}"
npm cache clean --force 2>/dev/null || true
pnpm store prune 2>/dev/null || true
echo -e "${GREEN}  ✓ npm/pnpm 缓存清理完成${NC}"
echo ""

# 6. 清理旧的 Docker 卷（如果不再需要旧数据）
echo -e "${YELLOW}[6/8] Docker 卷状态:${NC}"
docker volume ls
echo ""
echo "如果你确定要删除旧的 PostgreSQL/Redis 数据（会丢失所有数据），请手动运行:"
echo "  docker volume rm <卷名>"
echo "  或 docker compose down -v"
echo ""

# 7. 清理旧的构建产物
echo -e "${YELLOW}[7/8] 清理旧的构建产物...${NC}"
if [ -d "$PROJECT_DIR/apps/web/.next" ]; then
  du -sh "$PROJECT_DIR/apps/web/.next"
  rm -rf "$PROJECT_DIR/apps/web/.next" 2>/dev/null || true
  echo -e "${GREEN}  ✓ Next.js 构建产物清理完成${NC}"
fi
if [ -d "$PROJECT_DIR/apps/api/dist" ]; then
  rm -rf "$PROJECT_DIR/apps/api/dist" 2>/dev/null || true
  echo -e "${GREEN}  ✓ API dist 清理完成${NC}"
fi
echo ""

# 8. 磁盘清理后情况
echo -e "${YELLOW}[8/8] 清理后磁盘状态:${NC}"
df -h | grep -E '(Filesystem|/dev/)'
echo ""

echo "=========================================="
echo "  清理完成"
echo "=========================================="
echo ""
echo "注意:"
echo "  - 如果你需要彻底删除数据库数据，请运行: docker compose down -v"
echo "  - 然后重新初始化: bash deploy/setup-postgres.sh"
