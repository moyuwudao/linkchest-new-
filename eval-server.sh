#!/bin/bash
echo "=== 服务器硬件配置 ==="
echo "--- CPU ---"
lscpu 2>&1 | grep -E 'Model name|CPU\(s\)|Thread|核|Socket' | head -10
echo ""
echo "--- 内存 ---"
free -h
echo ""
echo "--- 磁盘 ---"
df -h / /opt 2>&1
echo ""
echo "--- 网络带宽 ---"
echo "(本机到腾讯云内网)"
ip addr 2>&1 | grep -E 'inet ' | head -5
echo ""
echo "--- 系统负载 ---"
uptime
echo ""
echo "--- Node.js 进程资源占用 ---"
pm2 jlist 2>&1 | python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data:
    pm_env = p.get('pm2_env', {})
    print(f\"  {p['name']:20s} pid={p['pid']:>7} cpu={p['monit']['cpu']:>3}% mem={p['monit']['memory']//1024//1024:>4}MB restart={pm_env.get('restart_time', 0)} instances={pm_env.get('instances', 1)}\")
"
echo ""
echo "--- 数据库连接数 ---"
mysql -u root -p${MYSQL_PWD:-'linkchest2026'} -e 'SHOW STATUS LIKE "Threads_connected"; SHOW STATUS LIKE "Max_used_connections"; SHOW VARIABLES LIKE "max_connections";' 2>&1 | head -15
