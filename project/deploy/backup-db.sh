#!/bin/bash
# ============================================================
# LinkChest PostgreSQL 备份脚本
# 建议通过 crontab 每日定时执行
# crontab -e 添加: 0 3 * * * /opt/linkchest/api/deploy/backup-db.sh
# ============================================================

set -e

BACKUP_DIR="/opt/linkchest/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/linkchest_$TIMESTAMP.sql.gz"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份（通过 docker exec）
echo "[$(date)] 开始备份 PostgreSQL 数据库..."
docker exec linkchest-db pg_dump -U linkchest linkchest | gzip > "$BACKUP_FILE"

# 检查备份文件
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] 备份完成: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ❌ 备份失败"
  exit 1
fi

# 保留最近30天的备份，删除更早的
find "$BACKUP_DIR" -name "linkchest_*.sql.gz" -mtime +30 -delete
echo "[$(date)] 已清理30天前的旧备份"
