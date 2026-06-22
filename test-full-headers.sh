#!/bin/bash
echo "=== 完整 HTTP 头（带 HTTP/2、UA、Accept-Encoding）==="
for f in "chunks/2160-86cbc135cf70849b.js" "chunks/3724-43e1adbb6f9bdc13.js" "chunks/polyfills-c67a75d1b6f99dc8.js"; do
  echo ""
  echo "--- $f ---"
  curl -sI \
    -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' \
    -H 'Accept-Encoding: gzip, deflate, br' \
    -H 'Accept: */*' \
    "https://linkchest.cn/_next/static/$f" | head -15
done

echo ""
echo "=== 第一次 GET（冷启动）==="
for f in "chunks/2160-86cbc135cf70849b.js" "chunks/3724-43e1adbb6f9bdc13.js" "chunks/polyfills-c67a75d1b6f99dc8.js"; do
  START=$(date +%s%N)
  curl -s \
    -H 'User-Agent: Mozilla/5.0 (iPhone)' \
    -H 'Accept-Encoding: gzip, deflate, br' \
    -o /dev/null \
    "https://linkchest.cn/_next/static/$f"
  END=$(date +%s%N)
  echo "  $f: $(( (END - START) / 1000000 ))ms"
done

echo ""
echo "=== 第二次 GET（应已缓存）==="
for f in "chunks/2160-86cbc135cf70849b.js" "chunks/3724-43e1adbb6f9bdc13.js" "chunks/polyfills-c67a75d1b6f99dc8.js"; do
  START=$(date +%s%N)
  curl -s \
    -H 'User-Agent: Mozilla/5.0 (iPhone)' \
    -H 'Accept-Encoding: gzip, deflate, br' \
    -o /dev/null \
    "https://linkchest.cn/_next/static/$f"
  END=$(date +%s%N)
  echo "  $f: $(( (END - START) / 1000000 ))ms"
done
