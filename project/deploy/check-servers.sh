#!/bin/bash
# ============================================================
# LinkChest 服务器健康检查脚本
# 一键检查所有服务器状态
#
# 使用方式:
#   bash deploy/check-servers.sh        # 检查所有服务器
#   bash deploy/check-servers.sh global # 仅检查海外
#   bash deploy/check-servers.sh china  # 仅检查国内
# ============================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务器配置
declare -A SERVERS
SERVERS["linkchest-global"]="43.133.44.232"
SERVERS["linkchest-cn-app"]="43.136.82.88"
SERVERS["linkchest-cn-db"]="114.132.81.246"

declare -A SERVER_MARKET
SERVER_MARKET["linkchest-global"]="海外"
SERVER_MARKET["linkchest-cn-app"]="国内-应用层"
SERVER_MARKET["linkchest-cn-db"]="国内-数据层"

declare -A SERVER_TYPE
SERVER_TYPE["linkchest-global"]="单体"
SERVER_TYPE["linkchest-cn-app"]="应用层"
SERVER_TYPE["linkchest-cn-db"]="数据层"

# 解析参数
TARGET="${1:-all}"

# 输出函数
print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  LinkChest 服务器健康检查${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_server_header() {
    local name=$1
    local ip=$2
    local market=$3
    local type=$4
    echo ""
    echo -e "${YELLOW}▶ ${market}服务器 (${type})${NC}"
    echo -e "  别名: ${GREEN}${name}${NC}"
    echo -e "  IP:   ${GREEN}${ip}${NC}"
}

check_ssh() {
    local name=$1
    local ip=$2
    echo -n "  SSH: "
    if timeout 5 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new ubuntu@${ip} "echo OK" 2>/dev/null | grep -q "OK"; then
        echo -e "${GREEN}✓ 正常${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        return 1
    fi
}

check_pm2() {
    local ip=$1
    local market=$2
    echo -n "  PM2: "
    result=$(ssh -o StrictHostKeyChecking=accept-new ubuntu@${ip} "pm2 status 2>/dev/null || echo FAILED" 2>/dev/null)
    if echo "$result" | grep -q "online"; then
        echo -e "${GREEN}✓ 运行中${NC}"
        echo "$result" | head -10 | sed 's/^/    /'
        return 0
    else
        echo -e "${RED}✗ 未运行${NC}"
        return 1
    fi
}

check_api() {
    local ip=$1
    echo -n "  API: "
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://${ip}:3001/health" 2>/dev/null)
    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓ 200 OK${NC}"
        return 0
    else
        echo -e "${RED}✗ $response${NC}"
        return 1
    fi
}

check_web() {
    local ip=$1
    echo -n "  WEB: "
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://${ip}:3003/login" 2>/dev/null)
    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓ 200 OK${NC}"
        return 0
    else
        echo -e "${RED}✗ $response${NC}"
        return 1
    fi
}

check_database() {
    local ip=$1
    echo -n "  DB:  "
    result=$(ssh -o StrictHostKeyChecking=accept-new ubuntu@${ip} "docker exec linkchest-db pg_isready -U linkchest 2>/dev/null || echo FAILED" 2>/dev/null)
    if echo "$result" | grep -q "accepting"; then
        echo -e "${GREEN}✓ 就绪${NC}"
        return 0
    else
        echo -e "${RED}✗ 未就绪${NC}"
        return 1
    fi
}

check_redis() {
    local ip=$1
    echo -n "  Redis: "
    result=$(ssh -o StrictHostKeyChecking=accept-new ubuntu@${ip} "docker exec linkchest-redis redis-cli ping 2>/dev/null || echo FAILED" 2>/dev/null)
    if echo "$result" | grep -q "PONG"; then
        echo -e "${GREEN}✓ PONG${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        return 1
    fi
}

check_cn_db_connection() {
    local app_ip=$1
    local db_ip=$2
    echo -n "  DB连接: "
    result=$(ssh -o StrictHostKeyChecking=accept-new ubuntu@${app_ip} "nc -zv ${db_ip} 5432 2>&1 || echo FAILED" 2>/dev/null)
    if echo "$result" | grep -q "succeeded"; then
        echo -e "${GREEN}✓ 可达${NC}"
        return 0
    else
        echo -e "${RED}✗ 不可达${NC}"
        return 1
    fi
}

check_server() {
    local name=$1
    local ip=$2
    local market=$3
    local type=$4

    print_server_header "$name" "$ip" "$market" "$type"

    check_ssh "$name" "$ip"

    if [ "$market" == "海外" ] || [ "$type" == "应用层" ]; then
        check_pm2 "$ip" "$market"
        check_api "$ip"
        check_web "$ip"
    fi

    if [ "$type" == "单体" ]; then
        check_database "$ip"
        check_redis "$ip"
    fi

    if [ "$type" == "应用层" ]; then
        check_redis "$ip"
        check_cn_db_connection "$ip" "114.132.81.246"
    fi

    if [ "$type" == "数据层" ]; then
        check_database "$ip"
    fi
}

print_header

# 根据参数决定检查哪些服务器
case "$TARGET" in
    global)
        check_server "linkchest-global" "${SERVERS[linkchest-global]}" "${SERVER_MARKET[linkchest-global]}" "${SERVER_TYPE[linkchest-global]}"
        ;;
    china)
        check_server "linkchest-cn-app" "${SERVERS[linkchest-cn-app]}" "${SERVER_MARKET[linkchest-cn-app]}" "${SERVER_TYPE[linkchest-cn-app]}"
        check_server "linkchest-cn-db" "${SERVERS[linkchest-cn-db]}" "${SERVER_MARKET[linkchest-cn-db]}" "${SERVER_TYPE[linkchest-cn-db]}"
        ;;
    all|"")
        for name in linkchest-global linkchest-cn-app linkchest-cn-db; do
            check_server "$name" "${SERVERS[$name]}" "${SERVER_MARKET[$name]}" "${SERVER_TYPE[$name]}"
        done
        ;;
    *)
        echo -e "${RED}❌ 未知参数: $TARGET${NC}"
        echo "用法: bash deploy/check-servers.sh [global|china|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  检查完成${NC}"
echo -e "${BLUE}================================================${NC}"
