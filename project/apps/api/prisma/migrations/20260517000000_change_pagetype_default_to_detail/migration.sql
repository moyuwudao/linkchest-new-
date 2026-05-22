-- AlterTable: 修改 pageType 默认值从 'other' 改为 'detail'
ALTER TABLE "collections" ALTER COLUMN "pageType" SET DEFAULT 'detail';
