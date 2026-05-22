#!/bin/bash
# 修改PostgreSQL密码

sudo docker exec linkchest-db psql -U linkchest -d linkchest -c "ALTER USER linkchest WITH PASSWORD 'LinkChest_DB_2026!';"

echo "密码修改完成"

# 验证
sudo docker exec -e PGPASSWORD=LinkChest_DB_2026! linkchest-db psql -U linkchest -d linkchest -c "SELECT current_user;"
