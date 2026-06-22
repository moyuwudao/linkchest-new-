#!/bin/bash
# 通过 docker exec 在 postgres 容器中查询 tier_config
docker exec linkchest-db psql -U linkchest -d linkchest -c "SELECT key, name_zh, description, pricing_config::text, benefits FROM tier_config ORDER BY sort_order;"
