-- 新增 emailVerified 和 passwordSet 字段到 users 表
ALTER TABLE "users" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordSet" BOOLEAN NOT NULL DEFAULT false;

-- 为已有数据设置 passwordSet = true（已有 passwordHash 的用户）
UPDATE "users" SET "passwordSet" = true WHERE "passwordHash" IS NOT NULL;

-- 为已有 email 的用户设置 emailVerified = true
UPDATE "users" SET "emailVerified" = true WHERE "email" IS NOT NULL;
