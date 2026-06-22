#!/bin/bash
echo "=== Node.js 端 - 是否 gzip 拖慢？ ==="
echo ""
for i in 1 2 3 4 5; do
  for f in "chunks/2160-86cbc135cf70849b.js" "chunks/3724-43e1adbb6f9bdc13.js" "chunks/polyfills-c67a75d1b6f99dc8.js"; do
    START=$(date +%s%N)
    # 不带 Accept-Encoding
    curl -s -o /dev/null "http://127.0.0.1:3003/_next/static/$f"
    END=$(date +%s%N)
    TIME_PLAIN=$(( (END - START) / 1000000 ))

    START=$(date +%s%N)
    # 带 gzip Accept-Encoding
    curl -s -H 'Accept-Encoding: gzip' -o /dev/null "http://127.0.0.1:3003/_next/static/$f"
    END=$(date +%s%N)
    TIME_GZIP=$(( (END - START) / 1000000 ))

    echo "  R$i $f: plain=${TIME_PLAIN}ms, gzip=${TIME_GZIP}ms"
  done
done

echo ""
echo "=== 响应头 (是否 Content-Encoding: gzip) ==="
curl -sI -H 'Accept-Encoding: gzip' "http://127.0.0.1:3003/_next/static/chunks/2160-86cbc135cf70849b.js" | head -10
