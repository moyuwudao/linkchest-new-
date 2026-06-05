#!/bin/bash
# ============================================================
# LinkChest 日志查看脚本
# 解决 pm2 logs 默认持续监听导致终端卡死的问题
#
# 使用方式:
#   bash deploy/check-logs.sh [global|china] [api|web] [行数]
#
# 示例:
#   bash deploy/check-logs.sh global api 50     # 查看海外 API 最近50行
#   bash deploy/check-logs.sh china web 30      # 查看国内 Web 最近30行
#   bash deploy/check-logs.sh global api        # 默认查看20行
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GLOBAL_IP="43.133.44.232"
CHINA_IP="43.136.82.88"

TARGET="${1:-global}"
SERVICE="${2:-api}"
LINES="${3:-20}"

# PM2 进程名：国内/海外统一为 linkchest-api / linkchest-web（去掉了 -global/-china 后缀）
case "$TARGET" in
    global)
        SERVER_IP="$GLOBAL_IP"
        case "$SERVICE" in
            api) PM2_NAME="linkchest-api" ;;
            web) PM2_NAME="linkchest-web" ;;
            *) echo -e "${RED}❌ 未知服务: $SERVICE (可用: api, web)${NC}"; exit 1 ;;
        esac
        ;;
    china)
        SERVER_IP="$CHINA_IP"
        case "$SERVICE" in
            api) PM2_NAME="linkchest-api" ;;
            web) PM2_NAME="linkchest-web" ;;
            *) echo -e "${RED}❌ 未知服务: $SERVICE (可用: api, web)${NC}"; exit 1 ;;
        esac
        ;;
    *)
        echo -e "${RED}❌ 未知目标: $TARGET${NC} (可用: global, china)"
        exit 1
        ;;
esac
