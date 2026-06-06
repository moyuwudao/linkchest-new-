#!/bin/bash
# LinkChest API 启动脚本
# 由 PM2 调用（海外 fork 模式），确保在正确的工作目录下启动 Express 服务
# 注意：国内 cluster 模式直接通过 ecosystem.config.js 调用 npx tsx，不走此脚本
#       但 .env 加载已在 src/index.ts 通过 dotenv 完成

cd /opt/linkchest/api/project/apps/api

# 加载 .env 文件（如果存在）- 双重保险，dotenv 也会加载
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "[API] 已加载 .env 配置"
fi

# 清除 tsx/esbuild 缓存，确保代码更新生效
rm -rf ../../node_modules/.cache/tsx 2>/dev/null || true
rm -rf /tmp/tsx-* 2>/dev/null || true

# 打印 Node 堆内存配置（来自 ecosystem.config.js 的 NODE_OPTIONS）
echo "[API] NODE_OPTIONS=$NODE_OPTIONS"
echo "[API] MARKET=$MARKET"

# 验证关键文件已更新
TIER_CONFIG_LINES=$(wc -l < src/services/tierConfig.ts 2>/dev/null | tr -d ' ')
echo "[API] tierConfig.ts line count: ${TIER_CONFIG_LINES:-N/A}"

exec npx tsx src/index.ts
