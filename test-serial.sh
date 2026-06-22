#!/bin/bash
echo "=== 单线程顺序测试（模拟浏览器单文件下载）==="
echo ""
TOTAL=0
COUNT=0
START=$(date +%s%N)
for resource in $(curl -s https://linkchest.cn/ | grep -oE '"/_next/static/[^"]+\.(js|css)"' | sort -u | tr -d '"'); do
  T=$(curl -s -o /dev/null -w "%{time_total}" "https://linkchest.cn${resource}")
  echo "  ${resource}: ${T}s"
  TOTAL=$(echo "$TOTAL + $T" | bc)
  COUNT=$((COUNT + 1))
done
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))
echo ""
echo "总耗时: ${TOTAL}s (${COUNT} 个资源)"
echo "总实测时间: ${ELAPSED}ms"
