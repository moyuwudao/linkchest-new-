#!/bin/bash
# ============================================================
# LinkChest Git-Only 统一部署入口 (MCP 优先版本)
# 所有代码通过服务器端 git pull 更新，不从本地推送
#
# 使用方式:
#   bash deploy/deploy.sh global   # 部署海外版
#   bash deploy/deploy.sh china    # 部署国内版
#
# MCP 连接方式（优先）:
#   通过 aliyun-servers MCP 连接服务器，避免 SSH 命令
#   降级方案: 传统 SSH 命令
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 海外应用层：雅加达 (43.157.240.68)
# 海外数据层：新加坡 (43.133.44.232) — 通过 autossh 隧道连接
GLOBAL_APP_IP="43.157.240.68"
GLOBAL_DB_IP="43.133.44.232"
CHINA_APP_IP="43.136.82.88"
CHINA_DB_IP="114.132.81.246"
REMOTE_DIR="/opt/linkchest/api"

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
    echo -e "${RED}❌ 请指定部署目标${NC}"
    echo ""
    echo "用法: bash deploy/deploy.sh <global|china>"
    echo ""
    echo "  global  - 海外应用层 ($GLOBAL_APP_IP) + 数据层 ($GLOBAL_DB_IP)"
    echo "  china   - 国内应用层 ($CHINA_APP_IP) + 数据层 ($CHINA_DB_IP)"
    exit 1
fi

# PM2 进程名：国内/海外统一为 linkchest-api（去掉了 -global/-china 后缀）
case "$TARGET" in
    global) SERVER_IP="$GLOBAL_APP_IP"; UPDATE_SCRIPT="project/deploy/update-server.sh"; PM2_API="linkchest-api" ;;
    china)  SERVER_IP="$CHINA_APP_IP";  UPDATE_SCRIPT="project/deploy/update-server-cn.sh"; PM2_API="linkchest-api" ;;
    *)
        echo -e "${RED}❌ 未知目标: $TARGET${NC} (可用: global, china)"
        exit 1
        ;;
esac
