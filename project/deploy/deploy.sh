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

GLOBAL_IP="43.133.44.232"
CHINA_IP="43.136.82.88"
REMOTE_DIR="/opt/linkchest/api"

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
    echo -e "${RED}❌ 请指定部署目标${NC}"
    echo ""
    echo "用法: bash deploy/deploy.sh <global|china>"
    echo ""
    echo "  global  - 海外服务器 ($GLOBAL_IP)"
    echo "  china   - 国内应用层 ($CHINA_IP)"
    exit 1
fi

case "$TARGET" in
    global) SERVER_IP="$GLOBAL_IP"; UPDATE_SCRIPT="deploy/update-server.sh"; PM2_API="linkchest-api-global" ;;
    china)  SERVER_IP="$CHINA_IP";  UPDATE_SCRIPT="deploy/update-server-cn.sh"; PM2_API="linkchest-api-china" ;;
    *)
        echo -e "${RED}❌ 未知目标: $TARGET${NC} (可用: global, china)"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  LinkChest Git-Only 部署${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "目标: ${YELLOW}${TARGET}${NC}  服务器: ${YELLOW}${SERVER_IP}${NC}"
echo -e "更新脚本: ${YELLOW}${UPDATE_SCRIPT}${NC}"
echo ""

# [1/4] 检查本地 Git 状态
echo -e "[1/4] ${BLUE}检查本地 Git 状态...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GIT_WARN=0
UNCOMMITTED=$(git status --porcelain 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
    echo -e "  ${YELLOW}⚠ 有未提交的更改:${NC}"
    echo "$UNCOMMITTED" | head -5 | sed 's/^/    /'
    [ "$(echo "$UNCOMMITTED" | wc -l)" -gt 5 ] && echo "    ..."
    GIT_WARN=1
fi

UNPUSHED=$(git log origin/master..HEAD --oneline 2>/dev/null)
if [ -n "$UNPUSHED" ]; then
    echo -e "  ${YELLOW}⚠ 有未推送的提交 (服务器不会获取):${NC}"
    echo "$UNPUSHED" | head -5 | sed 's/^/    /'
    GIT_WARN=1
fi

if [ "$GIT_WARN" -eq 0 ]; then
    echo "  ✓ Git 状态干净，所有代码已推送"
else
    echo -e "  ${YELLOW}⚠ 服务器将通过 git pull 获取代码，上述更改不会生效${NC}"
fi
echo ""

# [2/4] 测试服务器连接 (MCP 优先，降级 SSH)
echo -e "[2/4] ${BLUE}测试服务器连接...${NC}"

# 检测是否支持 MCP 方式
USE_MCP=false
CONNECTION_ID=""

# 检查 mcp_aliyun-servers_ssh_connect 是否可用
if command -v mcp_aliyun-servers_ssh_connect >/dev/null 2>&1; then
    echo -e "  ${BLUE}尝试 MCP 连接...${NC}"
    # MCP 连接
    CONNECTION_OUTPUT=$(mcp_aliyun-servers_ssh_connect host="$SERVER_IP" username="ubuntu" 2>&1) || true
    CONNECTION_ID=$(echo "$CONNECTION_OUTPUT" | grep -oE 'connectionId["'\''"'\'']?\s*[:=]\s*["'\''"'\'']?[^"'\''"'\''\s]+' | sed 's/.*[=:]\s*//' | tr -d '"'\''"'\'' \t' | head -1)
    
    if [ -n "$CONNECTION_ID" ]; then
        echo -e "  ${GREEN}✓ MCP 连接成功 (connectionId: ${CONNECTION_ID:0:8}...)${NC}"
        USE_MCP=true
    else
        echo -e "  ${YELLOW}⚠ MCP 连接未返回 connectionId，降级到 SSH${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ MCP 工具不可用，使用 SSH${NC}"
fi

# SSH 降级方案
if [ "$USE_MCP" = false ]; then
    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} "echo OK" 2>/dev/null | grep -q "OK"; then
        echo -e "  ${RED}❌ SSH 连接失败: ubuntu@${SERVER_IP}${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓ SSH 连接正常${NC}"
fi
echo ""

# [3/4] 服务器端 git pull + 执行更新脚本
echo -e "[3/4] ${BLUE}服务器端更新代码并执行 ${UPDATE_SCRIPT}...${NC}"

if [ "$USE_MCP" = true ] && [ -n "$CONNECTION_ID" ]; then
    # MCP 方式执行
    echo -e "  ${BLUE}使用 MCP 执行...${NC}"
    
    # 执行 git pull
    echo -e "  ${BLUE}  → git pull${NC}"
    mcp_aliyun-servers_ssh_exec connectionId="$CONNECTION_ID" command="cd $REMOTE_DIR && git pull" || {
        echo -e "  ${RED}❌ MCP git pull 失败${NC}"
        mcp_aliyun-servers_ssh_disconnect connectionId="$CONNECTION_ID" >/dev/null 2>&1 || true
        exit 1
    }
    
    # 执行更新脚本
    echo -e "  ${BLUE}  → bash ${UPDATE_SCRIPT}${NC}"
    mcp_aliyun-servers_ssh_exec connectionId="$CONNECTION_ID" command="cd $REMOTE_DIR && bash $UPDATE_SCRIPT" || {
        echo -e "  ${RED}❌ MCP 执行 ${UPDATE_SCRIPT} 失败${NC}"
        mcp_aliyun-servers_ssh_disconnect connectionId="$CONNECTION_ID" >/dev/null 2>&1 || true
        exit 1
    }
    
    # 断开 MCP 连接
    mcp_aliyun-servers_ssh_disconnect connectionId="$CONNECTION_ID" >/dev/null 2>&1 || true
else
    # SSH 方式执行
    ssh -o StrictHostKeyChecking=accept-new ubuntu@${SERVER_IP} << ENDSSH
set -e
cd ${REMOTE_DIR}

echo ">>> git pull"
git pull

echo ""
echo ">>> bash ${UPDATE_SCRIPT}"
bash ${UPDATE_SCRIPT}
ENDSSH
fi

echo ""
echo -e "  ${GREEN}✓ 服务器更新完成${NC}"
echo ""

# [4/4] 健康检查
echo -e "[4/4] ${BLUE}健康检查...${NC}"
sleep 3

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://${SERVER_IP}:3001/api/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo -e "  ✓ API 健康检查: ${GREEN}${API_STATUS}${NC}"
else
    echo -e "  ✗ API 健康检查: ${RED}${API_STATUS}${NC}"
fi

if [ "$TARGET" = "china" ]; then
    WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://${SERVER_IP}/login 2>/dev/null || echo "000")
    MANIFEST=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://${SERVER_IP}/manifest.json 2>/dev/null || echo "000")
    if [ "$WEB_STATUS" = "200" ]; then
        echo -e "  ✓ WEB 页面: ${GREEN}${WEB_STATUS}${NC}"
    else
        echo -e "  ✗ WEB 页面: ${RED}${WEB_STATUS}${NC}"
    fi
    if [ "$MANIFEST" = "200" ]; then
        echo -e "  ✓ 静态资源: ${GREEN}${MANIFEST}${NC}"
    else
        echo -e "  ✗ 静态资源: ${RED}${MANIFEST}${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  API: ${YELLOW}http://${SERVER_IP}:3001${NC}"
echo -e "  日志: ${YELLOW}ssh ubuntu@${SERVER_IP} 'pm2 logs ${PM2_API} --lines 50 --nostream'${NC}"
echo -e "  实时日志: ${YELLOW}ssh ubuntu@${SERVER_IP} 'pm2 logs ${PM2_API}'${NC} (按 Ctrl+C 退出)"
echo ""
