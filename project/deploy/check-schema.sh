#!/bin/bash
# 查看users表结构

sudo docker exec -e PGPASSWORD=LinkChest_DB_2026! linkchest-db psql -U linkchest -d linkchest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
"
