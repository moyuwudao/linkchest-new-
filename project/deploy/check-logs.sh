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

# 确定进程名和服务器IP
case "$TARGET" in
    global)
        SERVER_IP="$GLOBAL_IP"
        case "$SERVICE" in
            api) PM2_NAME="linkchest-api-global" ;;
            web) PM2_NAME="linkchest-web" ;;
            *) echo -e "${RED}❌ 未知服务: $SERVICE (可用: api, web)${NC}"; exit 1 ;;
        esac
        ;;
    china)
        SERVER_IP="$CHINA_IP"
        case "$SERVICE" in
            api) PM2_NAME="linkchest-api-china" ;;
            web) PM2_NAME="linkchest-web-china" ;;
            *) echo -e "${RED}❌ 未知服务: $SERVICE (可用: api, web)${NC}"; exit 1 ;;
        esac
        ;;
    *)
        echo -e "${RED}❌ 未知目标: $TARGET (可用: global, china)${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LinkChest 日志查看${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "目标: ${YELLOW}${TARGET}${NC}  服务: ${YELLOW}${SERVICE}${NC}  行数: ${YELLOW}${LINES}${NC}"
echo ""

# 测试 SSH 连接
echo -e "${BLUE}测试 SSH 连接...${NC}"
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} "echo OK" 2>/dev/null | grep -q "OK"; then
    echo -e "  ${RED}❌ SSH 连接失败: ubuntu@${SERVER_IP}${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ SSH 连接正常${NC}"
echo ""

# 查看日志（使用 --nostream 避免阻塞）
echo -e "${BLUE}--- ${PM2_NAME} 最近 ${LINES} 行日志 ---${NC}"
ssh -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} "pm2 logs ${PM2_NAME} --lines ${LINES} --nostream"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  日志查看完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "如需实时监听新日志，执行:"
echo -e "  ${YELLOW}ssh ubuntu@${SERVER_IP} 'pm2 logs ${PM2_NAME}'${NC}"
echo -e "  (按 Ctrl+C 退出实时监听)"
echo ""
