#!/bin/bash
echo "=== Testing linkchest.cn homepage ==="
echo ""
echo "1. HTML response:"
curl -s -o /dev/null -w "DNS:%{time_namelookup}s TTFB:%{time_starttransfer}s Total:%{time_total}s Size:%{size_download}B\n" https://linkchest.cn/

echo ""
echo "2. List static resources (JS/CSS/fonts):"
curl -s https://linkchest.cn/ > /tmp/home.html
grep -oE '"/_next/static/[^"]+"' /tmp/home.html | sort -u | head -15 > /tmp/resources.txt
cat /tmp/resources.txt

echo ""
echo "3. Download all _next/static resources and measure time:"
TOTAL_TIME=0
TOTAL_SIZE=0
COUNT=0
while IFS= read -r resource; do
  # remove leading/trailing quotes
  RES=$(echo "$resource" | tr -d '"')
  START=$(date +%s%N)
  curl -s -o /dev/null "https://linkchest.cn${RES}"
  END=$(date +%s%N)
  TIME_MS=$(( (END - START) / 1000000 ))
  SIZE=$(curl -s -o /dev/null -w "%{size_download}" "https://linkchest.cn${RES}")
  echo "  ${RES} - ${TIME_MS}ms, ${SIZE}B"
  TOTAL_TIME=$((TOTAL_TIME + TIME_MS))
  TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
  COUNT=$((COUNT + 1))
done < /tmp/resources.txt
echo ""
echo "  Total: ${COUNT} resources, ${TOTAL_TIME}ms, ${TOTAL_SIZE} bytes ($(($TOTAL_SIZE/1024))KB)"

echo ""
echo "4. Check if Cloudflare is in front:"
curl -sI https://linkchest.cn/ | head -10
