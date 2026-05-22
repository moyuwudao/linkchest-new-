#!/bin/bash
# ============================================================
# LinkChest API 数据库迁移 + 启动脚本
# 用于首次部署或数据库 schema 更新后执行
# 警告：生产环境请先在备份后执行！
# 权限设置：chmod +x deploy/migrate-and-start-api.sh
# ============================================================

set -e

cd /opt/linkchest/api/apps/api

echo "[$(date)] 执行 Prisma 数据库迁移..."
npx prisma migrate deploy

echo "[$(date)] 启动 API 服务..."
exec node dist/index.js
