#!/bin/bash
# 修复数据库用户

# 创建新用户
sudo docker exec linkchest-db psql -U postgres -c "CREATE USER linkchest2 WITH PASSWORD 'Test1234!';" 2>/dev/null || true

# 授予权限
sudo docker exec linkchest-db psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE linkchest TO linkchest2;"
sudo docker exec linkchest-db psql -U postgres -d linkchest -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO linkchest2;"
sudo docker exec linkchest-db psql -U postgres -d linkchest -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO linkchest2;"

# 验证连接
sudo docker exec -e PGPASSWORD=Test1234! linkchest-db psql -U linkchest2 -d linkchest -c "SELECT current_user;"

echo "数据库用户修复完成"
