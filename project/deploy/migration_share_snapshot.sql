-- ============================================================
-- LinkChest 数据库迁移脚本 - ShareItem 快照模式
-- 执行方式: 在服务器上运行以下命令
--   docker exec -i linkchest-db psql -U linkchest -d linkchest < migration_share_snapshot.sql
-- ============================================================

-- Step 1: 添加快照字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_items' AND column_name='title') THEN
    ALTER TABLE "share_items" ADD COLUMN "title" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_items' AND column_name='coverImage') THEN
    ALTER TABLE "share_items" ADD COLUMN "coverImage" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_items' AND column_name='platform') THEN
    ALTER TABLE "share_items" ADD COLUMN "platform" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_items' AND column_name='url') THEN
    ALTER TABLE "share_items" ADD COLUMN "url" TEXT;
  END IF;
END $$;

-- Step 2: 从关联的 Collection 回填快照数据
UPDATE "share_items" si
SET
  "title" = COALESCE(c."title", '已失效的收藏'),
  "coverImage" = c."coverImage",
  "platform" = COALESCE(c."platform", 'unknown'),
  "url" = COALESCE(c."url", '')
FROM "collections" c
WHERE si."collectionId" = c."id"
  AND si."title" IS NULL;

-- Step 3: 对于 collectionId 对应的 Collection 已被删除的 ShareItem，设置默认值
UPDATE "share_items"
SET
  "title" = '已失效的收藏',
  "coverImage" = NULL,
  "platform" = 'unknown',
  "url" = ''
WHERE "title" IS NULL;

-- Step 4: 将新字段设为 NOT NULL（回填完成后）
ALTER TABLE "share_items" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "share_items" ALTER COLUMN "platform" SET NOT NULL;
ALTER TABLE "share_items" ALTER COLUMN "url" SET NOT NULL;

-- Step 5: 修改 collectionId 为可选，并更改外键 onDelete 行为
-- 先删除旧外键约束（如果存在）
ALTER TABLE "share_items" DROP CONSTRAINT IF EXISTS "share_items_collectionId_fkey";
-- 修改 collectionId 为可选
ALTER TABLE "share_items" ALTER COLUMN "collectionId" DROP NOT NULL;
-- 重新添加外键，onDelete 改为 SET NULL
ALTER TABLE "share_items" ADD CONSTRAINT "share_items_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: 删除旧唯一约束，添加新的基于 (shareId, url) 的唯一约束
ALTER TABLE "share_items" DROP CONSTRAINT IF EXISTS "share_items_shareId_collectionId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "share_items_shareId_url_key" ON "share_items"("shareId", "url");

-- 完成
SELECT 'ShareItem 快照模式迁移完成!' AS result;
