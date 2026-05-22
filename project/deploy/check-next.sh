#!/bin/bash
cd /opt/linkchest/web-app/apps/web

echo "=== Next.js版本 ==="
if [ -f node_modules/next/package.json ]; then
    grep '"version"' node_modules/next/package.json | head -1
else
    echo "node_modules/next 不存在"
fi

echo ""
echo "=== package.json中的next版本 ==="
grep '"next"' package.json

echo ""
echo "=== 检查上级node_modules ==="
if [ -d /opt/linkchest/web-app/node_modules/next ]; then
    echo "上级有next"
else
    echo "上级没有next"
fi

echo ""
echo "=== 当前目录结构 ==="
pwd
ls -la
