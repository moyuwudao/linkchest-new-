-- 添加国内市场相关字段（微信登录、支付宝登录、实名认证）

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "googleId" TEXT UNIQUE,
ADD COLUMN "appleId" TEXT UNIQUE,
ADD COLUMN "facebookId" TEXT UNIQUE,
ADD COLUMN "wechatOpenId" TEXT UNIQUE,
ADD COLUMN "wechatUnionId" TEXT,
ADD COLUMN "alipayId" TEXT UNIQUE,
ADD COLUMN "authSource" TEXT DEFAULT 'email',
ADD COLUMN "realNameVerified" BOOLEAN DEFAULT false,
ADD COLUMN "lang" TEXT DEFAULT 'zh',
ADD COLUMN "userTier" TEXT DEFAULT 'medium',
ADD COLUMN "heavyExpiresAt" TIMESTAMP(3),
ADD COLUMN "superExpiresAt" TIMESTAMP(3),
ADD COLUMN "status" TEXT DEFAULT 'active',
ADD COLUMN "bannedAt" TIMESTAMP(3),
ADD COLUMN "bannedReason" TEXT,
ADD COLUMN "loginAttempts" INTEGER DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "lastLoginIp" TEXT,
ADD COLUMN "settings" JSONB;
