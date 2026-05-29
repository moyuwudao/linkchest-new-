#!/bin/bash
# LinkChest API 启动脚本（完整版）
# 由 PM2 调用，确保在正确的工作目录下启动 Express 服务

cd /opt/linkchest/api/project/apps/api

# 加载环境变量
if [ -f .env ]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    # 跳过空行和注释行
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    # 导出环境变量
    export "$line"
  done < .env
fi

# 清除 tsx/esbuild 缓存，确保代码更新生效
rm -rf ../../node_modules/.cache/tsx 2>/dev/null || true
rm -rf /tmp/tsx-* 2>/dev/null || true

# 验证关键文件已更新
TIER_CONFIG_LINES=$(wc -l < src/services/tierConfig.ts | tr -d ' ')
echo "[API] tierConfig.ts line count: $TIER_CONFIG_LINES"

exec npx tsx src/index.ts
