#!/bin/bash
# LinkChest Web 启动脚本
# 由 PM2 调用，确保在正确的工作目录下启动 Next.js
set -e

cd /opt/linkchest/api/apps/web

echo "[Web] CWD: $(pwd)"
echo "[Web] Node: $(node --version)"
echo "[Web] Next binary: $(which next || echo 'not in PATH')"

# 检查 .next 构建输出是否存在
if [ ! -d ".next" ]; then
    echo "[Web] ERROR: .next directory not found! Run npm run build first."
    exit 1
fi

# 验证关键依赖存在 (npm workspaces 下 next 可能在 apps/web/node_modules)
if [ ! -d "./node_modules/next" ] && [ ! -d "../../node_modules/next" ]; then
    echo "[Web] ERROR: next package not found in node_modules"
    exit 1
fi

echo "[Web] .next directory exists, starting server..."
# 优先使用本地 node_modules 的 next，如果不存在则回退到根目录
if [ -f "./node_modules/.bin/next" ]; then
    exec ./node_modules/.bin/next start -p 3003 -H 0.0.0.0
else
    exec ../../node_modules/.bin/next start -p 3003 -H 0.0.0.0
fi
