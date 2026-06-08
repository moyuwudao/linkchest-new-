#!/bin/bash
# 简化版：直接将查询命令在远程服务器上执行
ssh ubuntu@43.136.82.88 bash << 'REMOTE_EOF'
export PGPASSWORD='LinkChest_DB_2026!'
psql -h 114.132.81.246 -U linkchest -d linkchest -c "SELECT key, pricing_config FROM tier_config ORDER BY sort_order;"
REMOTE_EOF
