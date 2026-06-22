#!/bin/bash
docker exec linkchest-db psql -U linkchest -d linkchest -c "SELECT key, \"nameZh\", description, pricing_config::text, benefits FROM tier_configs ORDER BY \"sortOrder\";"
