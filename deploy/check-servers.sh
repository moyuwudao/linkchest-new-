#!/bin/bash

# 服务器列表
GLOBAL_SERVERS=("linkchest-global")
CHINA_SERVERS=("linkchest-cn-app" "linkchest-cn-db")

check_servers() {
    local servers=("$@")
    for server in "${servers[@]}"; do
        echo "====================================="
        echo "正在检查服务器: $server"
        ssh -o BatchMode=yes -o ConnectTimeout=5 "$server" "echo \"✅ 连接成功！当前用户：\$(whoami)\" && uptime -p"
        if [ $? -ne 0 ]; then
            echo "❌ $server 连接失败或超时"
        fi
        echo "====================================="
        echo ""
    done
}

case "$1" in
    "global")
        echo "▶ 开始检查海外服务器..."
        check_servers "${GLOBAL_SERVERS[@]}"
        ;;
    "china")
        echo "▶ 开始检查国内服务器..."
        check_servers "${CHINA_SERVERS[@]}"
        ;;
    "")
        echo "▶ 开始检查所有服务器..."
        check_servers "${GLOBAL_SERVERS[@]}" "${CHINA_SERVERS[@]}"
        ;;
    *)
        echo "未知参数: $1"
        echo "用法: bash deploy/check-servers.sh [global|china]"
        exit 1
        ;;
esac

