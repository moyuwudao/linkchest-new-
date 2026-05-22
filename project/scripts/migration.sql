ALTER TABLE "users" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordSet" BOOLEAN NOT NULL DEFAULT false;
UPDATE "users" SET "passwordSet" = true WHERE "passwordHash" IS NOT NULL;
UPDATE "users" SET "emailVerified" = true WHERE "email" IS NOT NULL;
