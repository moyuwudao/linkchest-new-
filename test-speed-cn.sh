#!/bin/bash
echo "=== linkchest.cn 速度实测（WSL 深圳联通出口）==="
echo ""

echo "1. 主页 HTML:"
curl -s -o /dev/null -w "   TTFB:%{time_starttransfer}s Total:%{time_total}s Size:%{size_download}B Speed:%{speed_download}B/s\n" https://linkchest.cn/

echo ""
echo "2. /download HTML:"
curl -s -o /dev/null -w "   TTFB:%{time_starttransfer}s Total:%{time_total}s Size:%{size_download}B\n" https://linkchest.cn/download

echo ""
echo "3. /collections HTML:"
curl -s -o /dev/null -w "   TTFB:%{time_starttransfer}s Total:%{time_total}s Size:%{size_download}B\n" https://linkchest.cn/collections

echo ""
echo "4. 静态资源 JS 速度（_next/static）:"
curl -s https://linkchest.cn/ > /tmp/home.html
grep -oE '"/_next/static/[^"]+\.js"' /tmp/home.html | sort -u | head -8 > /tmp/res.txt
while IFS= read -r resource; do
  RES=$(echo "$resource" | tr -d '"')
  curl -s -o /dev/null -w "   ${RES}: %{size_download}B in %{time_total}s (%{speed_download}B/s)\n" "https://linkchest.cn${RES}"
done < /tmp/res.txt

echo ""
echo "5. CSS 资源速度:"
grep -oE '"/_next/static/[^"]+\.css"' /tmp/home.html | sort -u | head -3 > /tmp/res.css
while IFS= read -r resource; do
  RES=$(echo "$resource" | tr -d '"')
  curl -s -o /dev/null -w "   ${RES}: %{size_download}B in %{time_total}s\n" "https://linkchest.cn${RES}"
done < /tmp/res.css

echo ""
echo "6. APK 下载速度:"
curl -s -o /dev/null -w "   /LinkChest.apk: %{size_download}B in %{time_total}s (%{speed_download}B/s)\n" https://linkchest.cn/LinkChest.apk

echo ""
echo "7. 服务端响应头:"
curl -sI https://linkchest.cn/ | head -15
