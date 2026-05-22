-- Migration: add_tag_i18n_and_user_lang
-- Description: Add nameCn, nameEn columns to tags table and lang column to users table

-- Add lang column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lang" VARCHAR(10) NOT NULL DEFAULT 'zh';

-- Add nameCn and nameEn columns to tags table
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "nameCn" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "nameEn" VARCHAR(255) NOT NULL DEFAULT '';

-- Copy existing tag names to both nameCn and nameEn columns
UPDATE "tags" SET "nameCn" = "name", "nameEn" = "name" WHERE "nameCn" = '' AND "nameEn" = '';

-- Drop the old unique constraint on (userId, name)
-- Note: This is handled by Prisma automatically, but you may need to do it manually

-- Create new unique constraints for i18n support
-- Note: These may fail if there are duplicate names across languages for the same user
-- In that case, you may need to handle duplicates manually

-- Create unique index for nameCn
CREATE UNIQUE INDEX IF NOT EXISTS "tags_userId_nameCn_key" ON "tags"("userId", "nameCn") WHERE "nameCn" != '';

-- Create unique index for nameEn
CREATE UNIQUE INDEX IF NOT EXISTS "tags_userId_nameEn_key" ON "tags"("userId", "nameEn") WHERE "nameEn" != '';
