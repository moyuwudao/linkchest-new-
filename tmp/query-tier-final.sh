#!/bin/bash
docker exec linkchest-db psql -U linkchest -d linkchest -c "SELECT key, name_zh, description, pricing_config::text, benefits FROM tier_configs ORDER BY sort_order;"
