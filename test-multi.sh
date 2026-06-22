#!/bin/bash
echo "=== 连续 5 次完整加载测试（首页 + 所有资源）==="
echo ""
for i in 1 2 3 4 5; do
  echo "--- 第 $i 次 ---"
  TOTAL=0
  COUNT=0
  # HTML
  TIME_HTML=$(curl -s -o /dev/null -w "%{time_total}" https://linkchest.cn/)
  echo "  HTML: ${TIME_HTML}s"
  TOTAL=$(echo "$TOTAL + $TIME_HTML" | bc)
  COUNT=$((COUNT + 1))

  # 静态资源
  curl -s https://linkchest.cn/ > /tmp/home.html
  for resource in $(grep -oE '"/_next/static/[^"]+\.(js|css)"' /tmp/home.html | sort -u | tr -d '"'); do
    T=$(curl -s -o /dev/null -w "%{time_total}" "https://linkchest.cn${resource}")
    echo "  ${resource}: ${T}s"
    TOTAL=$(echo "$TOTAL + $T" | bc)
    COUNT=$((COUNT + 1))
  done
  echo "  总计: ${TOTAL}s (${COUNT} 个资源)"
  echo ""
done
