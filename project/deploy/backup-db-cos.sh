#!/bin/bash
BACKUP_DIR=/opt/backups
DB_NAME=linkchest
DB_USER=linkchest
LOG=$BACKUP_DIR/backup.log
DB_PASS=$(grep DATABASE_URL /opt/linkchest/api/apps/api/.env | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
if [ -z "$DB_PASS" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Failed to extract DB password" >> $LOG
  exit 1
fi
export PGPASSWORD=$DB_PASS
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
FILE=$BACKUP_DIR/linkchest_${DATE}_${TIME}.sql.gz
mkdir -p $BACKUP_DIR
if pg_dump -h localhost -U $DB_USER -d $DB_NAME --no-owner --no-privileges | gzip > $FILE; then
  SIZE=$(du -h $FILE | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup success: $FILE ($SIZE)" >> $LOG
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Backup FAILED" >> $LOG
  rm -f $FILE
  exit 1
fi

# 上传 COS
if python3 /opt/linkchest/api/deploy/upload-to-cos.py "$FILE" >> $LOG 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ☁️ COS upload success" >> $LOG
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ COS upload failed (backup kept locally)" >> $LOG
fi

# 清理 COS 上超过30天的旧备份（轻量对象存储不支持生命周期规则，用脚本替代）
if python3 /opt/linkchest/api/deploy/cleanup-lhcos-backups.py 30 >> $LOG 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 COS old backups cleaned" >> $LOG
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ COS backup cleanup failed" >> $LOG
fi

# 清理本地旧备份
deleted14=$(find $BACKUP_DIR -name 'linkchest_*.sql.gz' -mtime +14 -delete -print | wc -l)
deleted_other=$(find $BACKUP_DIR -name 'linkchest_*.sql.gz' -mtime +3 -mtime -15 ! -mtime 5 ! -mtime 7 ! -mtime 14 -delete -print | wc -l)
remaining=$(ls -1 $BACKUP_DIR/linkchest_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 Local cleanup: removed 14d+:$deleted14, other:$deleted_other, remaining:$remaining" >> $LOG
