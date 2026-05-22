#!/bin/bash
# 修复PostgreSQL认证配置

# 修改pg_hba.conf为md5认证
cat > /tmp/pg_hba.conf << 'EOF'
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             0.0.0.0/0               md5
EOF

# 复制到容器
sudo docker cp /tmp/pg_hba.conf linkchest-db:/var/lib/postgresql/data/pg_hba.conf

# 重启PostgreSQL
sudo docker restart linkchest-db
sleep 5

# 验证状态
sudo docker ps | grep linkchest-db
echo "PostgreSQL认证配置已更新"
