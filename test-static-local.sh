#!/bin/bash
echo "=== 静态资源本地读取（绕过 nginx）==="
for f in "chunks/2160-86cbc135cf70849b.js" "chunks/3724-43e1adbb6f9bdc13.js" "chunks/6931-fc44c8cf0b3dfd7d.js" "chunks/polyfills-c67a75d1b6f99dc8.js"; do
  START=$(date +%s%N)
  cat "/opt/linkchest/api/project/apps/web/.next/static/$f" > /dev/null
  END=$(date +%s%N)
  echo "  $f: $(( (END - START) / 1000000 ))ms (size: $(stat -c %s "/opt/linkchest/api/project/apps/web/.next/static/$f") bytes)"
done

echo ""
echo "=== 同步测试：直接 nginx 读取 vs 走 Node.js ==="
echo ""
echo "Node.js 端 (端口 3003) - 单文件:"
for f in "chunks/2160-86cbc135cf70849b.js" "chunks/3724-43e1adbb6f9bdc13.js"; do
  START=$(date +%s%N)
  curl -s -o /dev/null "http://127.0.0.1:3003/_next/static/$f"
  END=$(date +%s%N)
  echo "  $f: $(( (END - START) / 1000000 ))ms"
done

echo ""
echo "=== /api 健康检查 ==="
START=$(date +%s%N)
curl -s -o /dev/null -w "HTTP:%{http_code}" "http://127.0.0.1:3001/api/health"
END=$(date +%s%N)
echo " - $(( (END - START) / 1000000 ))ms"

echo ""
echo "=== Node.js 进程内存/CPU 状态 ==="
ps -o pid,pcpu,pmem,rss,cmd -p $(pm2 jlist 2>/dev/null | python3 -c "import json,sys; data=json.load(sys.stdin); [print(p['pid']) for p in data if p['name']=='linkchest-web']" 2>/dev/null) 2>&1
