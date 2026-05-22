#!/bin/bash
# LinkChest 服务器存储分析与清理脚本
# 用法: bash deploy/check-storage.sh
# 先分析，确认后再运行清理

set -e

PROJECT_DIR="/opt/linkchest"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  LinkChest 服务器存储分析"
echo "=========================================="
echo ""

# 1. 总体磁盘使用情况
echo -e "${YELLOW}[1] 总体磁盘使用:${NC}"
df -h | grep -E '(Filesystem|/dev/)'
echo ""

# 2. Docker 卷（可能残留旧数据）
echo -e "${YELLOW}[2] Docker 命名卷:${NC}"
docker volume ls | grep -E '(linkchest|postgres|redis)' || echo "  未发现相关卷"
echo ""

# 3. Docker 容器状态
echo -e "${YELLOW}[3] Docker 容器:${NC}"
docker ps -a | grep -E '(linkchest|postgres|redis)' || echo "  未发现相关容器"
echo ""

# 4. Docker 镜像大小
echo -e "${YELLOW}[4] Docker 镜像占用:${NC}"
docker images | grep -E '(linkchest|postgres|redis|node|<none>)' || echo "  未发现相关镜像"
echo ""

# 5. 项目目录大小
echo -e "${YELLOW}[5] 项目目录大小:${NC}"
if [ -d "$PROJECT_DIR" ]; then
  du -sh "$PROJECT_DIR"
  echo ""
  echo "  子目录明细:"
  du -sh "$PROJECT_DIR"/* 2>/dev/null | sort -rh | head -20
else
  echo "  项目目录不存在: $PROJECT_DIR"
fi
echo ""

# 6. node_modules 占用
echo -e "${YELLOW}[6] node_modules 占用:${NC}"
find "$PROJECT_DIR" -name "node_modules" -maxdepth 3 -type d -exec du -sh {} \; 2>/dev/null || echo "  未找到 node_modules"
echo ""

# 7. 旧备份文件
echo -e "${YELLOW}[7] 备份文件:${NC}"
find "$PROJECT_DIR" -name "*.backup" -o -name "*.bak" -o -name "*.old" -o -name "*.tar.gz" -o -name "*.zip" 2>/dev/null | head -20 || echo "  未发现备份文件"
echo ""

# 8. 日志文件
echo -e "${YELLOW}[8] 日志文件:${NC}"
find "$PROJECT_DIR" -name "*.log" -type f -exec du -sh {} \; 2>/dev/null | sort -rh | head -10 || echo "  未发现日志文件"
echo ""

# 9. PM2 日志
echo -e "${YELLOW}[9] PM2 日志:${NC}"
PM2_LOG_DIR="$HOME/.pm2/logs"
if [ -d "$PM2_LOG_DIR" ]; then
  du -sh "$PM2_LOG_DIR"
  ls -lh "$PM2_LOG_DIR" | grep linkchest 2>/dev/null || echo "  未发现 LinkChest PM2 日志"
else
  echo "  PM2 日志目录不存在"
fi
echo ""

# 10. Redis 持久化文件
echo -e "${YELLOW}[10] Redis 持久化文件:${NC}"
docker exec linkchest-redis ls -lh /data 2>/dev/null || echo "  无法访问 Redis 容器数据"
echo ""

# 11. 系统临时文件
echo -e "${YELLOW}[11] 系统临时文件:${NC}"
du -sh /tmp 2>/dev/null | awk '{print "  /tmp: " $1}'
du -sh /var/tmp 2>/dev/null | awk '{print "  /var/tmp: " $1}'
echo ""

# 12. 旧部署文件/目录
echo -e "${YELLOW}[12] 可疑旧目录:${NC}"
ls -la "$PROJECT_DIR"/deploy/ 2>/dev/null || echo "  deploy 目录不存在"
echo ""

echo "=========================================="
echo "  分析完成"
echo "=========================================="
echo ""
echo -e "${GREEN}如需清理，请运行: bash deploy/cleanup-server.sh${NC}"
