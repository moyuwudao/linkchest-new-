-- 新增 userTier 字段
ALTER TABLE "users" ADD COLUMN "userTier" TEXT NOT NULL DEFAULT 'medium';

-- Share 表新增字段
ALTER TABLE "shares" ADD COLUMN "isPlaza" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shares" ADD COLUMN "allowSync" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shares" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "shares" ADD COLUMN "plazaTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Share 表新增索引
CREATE INDEX "shares_isPlaza_createdAt_idx" ON "shares"("isPlaza", "createdAt");

-- List 表新增字段
ALTER TABLE "lists" ADD COLUMN "sourceShareId" TEXT;
ALTER TABLE "lists" ADD COLUMN "sourceType" TEXT DEFAULT 'original';

-- List 表新增索引
CREATE INDEX "lists_sourceShareId_idx" ON "lists"("sourceShareId");

-- ShareItem 表新增字段
ALTER TABLE "share_items" ADD COLUMN "tags" JSONB;
ALTER TABLE "share_items" ADD COLUMN "originalCreatedAt" TIMESTAMP(3);

-- 新增 CoverImage 表
CREATE TABLE "cover_images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT,
    "cosKey" TEXT NOT NULL,
    "cosUrl" TEXT NOT NULL,
    "urlExpiresAt" TIMESTAMP(3),
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cover_images_collectionId_key" ON "cover_images"("collectionId");
CREATE INDEX "cover_images_userId_idx" ON "cover_images"("userId");
CREATE INDEX "cover_images_collectionId_idx" ON "cover_images"("collectionId");
CREATE INDEX "cover_images_createdAt_idx" ON "cover_images"("createdAt");

ALTER TABLE "cover_images" ADD CONSTRAINT "cover_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 新增 ShareSubscription 表
CREATE TABLE "share_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_subscriptions_userId_shareId_key" ON "share_subscriptions"("userId", "shareId");
CREATE INDEX "share_subscriptions_userId_idx" ON "share_subscriptions"("userId");
CREATE INDEX "share_subscriptions_shareId_idx" ON "share_subscriptions"("shareId");

ALTER TABLE "share_subscriptions" ADD CONSTRAINT "share_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_subscriptions" ADD CONSTRAINT "share_subscriptions_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 新增 ShareView 表（UV 统计）
CREATE TABLE "share_views" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_views_shareId_userId_key" ON "share_views"("shareId", "userId");
CREATE INDEX "share_views_shareId_idx" ON "share_views"("shareId");

ALTER TABLE "share_views" ADD CONSTRAINT "share_views_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_views" ADD CONSTRAINT "share_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
