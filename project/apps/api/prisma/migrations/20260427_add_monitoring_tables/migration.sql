-- 运维监控后台表：错误事件、告警规则、告警历史
-- Created: 2026-04-27

-- 错误事件表（5xx/未捕获异常自动聚合）
CREATE TABLE IF NOT EXISTS "error_events" (
    "id" TEXT NOT NULL,
    "errorCode" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "userId" TEXT,
    "ip" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "error_events_status_lastAt_idx" ON "error_events"("status", "lastAt");
CREATE INDEX IF NOT EXISTS "error_events_errorCode_idx" ON "error_events"("errorCode");
CREATE INDEX IF NOT EXISTS "error_events_firstAt_idx" ON "error_events"("firstAt");

-- 告警规则表
CREATE TABLE IF NOT EXISTS "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditionConfig" JSONB NOT NULL,
    "channels" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "priority" TEXT NOT NULL DEFAULT 'P1',
    "silentStart" TEXT,
    "silentEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- 告警历史表
CREATE TABLE IF NOT EXISTS "alert_history" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channelsSent" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "alert_history_ruleId_createdAt_idx" ON "alert_history"("ruleId", "createdAt");
CREATE INDEX IF NOT EXISTS "alert_history_createdAt_idx" ON "alert_history"("createdAt");

-- 外键约束
ALTER TABLE "alert_history" DROP CONSTRAINT IF EXISTS "alert_history_ruleId_fkey";
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
