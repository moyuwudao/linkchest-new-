#!/bin/bash
# 查询 tier_config 表的实际状态
PGPASSWORD='LinkChest_DB_2026!' psql -h 114.132.81.246 -U linkchest -d linkchest -c "SELECT key, name_zh, description, pricing_config::text, benefits FROM tier_config ORDER BY sort_order;"
