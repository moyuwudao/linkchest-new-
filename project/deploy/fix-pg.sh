#!/bin/bash
# 修复PostgreSQL认证配置

cat > /tmp/pg_hba_fix.conf << 'HBAEOF'
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             0.0.0.0/0               md5
HBAEOF

sudo docker cp /tmp/pg_hba_fix.conf linkchest-db:/var/lib/postgresql/data/pg_hba.conf
sudo docker restart linkchest-db
sleep 5
sudo docker ps | grep linkchest-db
echo "PostgreSQL认证配置已更新为md5"
