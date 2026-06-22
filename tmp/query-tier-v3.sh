#!/bin/bash
docker exec linkchest-db psql -U linkchest -d linkchest -c "SELECT key, \"nameZh\", description, \"pricingConfig\"::text, benefits FROM tier_configs ORDER BY \"sortOrder\";"
