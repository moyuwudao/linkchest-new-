-- 为 ShareItem 添加 coverStrategy 字段快照
-- 默认值 'brand' 兼容历史未迁移的快照数据，分享页展示为平台色+标题
ALTER TABLE "share_items" ADD COLUMN "coverStrategy" TEXT DEFAULT 'brand';
