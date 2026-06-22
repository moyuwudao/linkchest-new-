#!/bin/bash
echo "=== linkchest.cn 速度测试 ==="
echo ""

for URL in "/" "/download" "/download/chrome-extension" "/collections"; do
  echo "📍 ${URL}:"
  curl -s -o /dev/null -w "  HTML: TTFB=%{time_starttransfer}s Total=%{time_total}s Size=%{size_download}B\n" "https://linkchest.cn${URL}"
done

echo ""
echo "🌐 主页静态资源速度 (前 5):"
curl -s https://linkchest.cn/ | grep -oE '"/_next/static/[^"]+"' | sort -u | head -5 | while read resource; do
  RES=$(echo "$resource" | tr -d '"')
  curl -s -o /dev/null -w "  ${RES}: %{time_total}s, %{size_download}B\n" "https://linkchest.cn${RES}"
done

echo ""
echo "🔍 资源总览："
JS_COUNT=$(curl -s https://linkchest.cn/ | grep -oE '"/_next/static/[^"]*\.js"' | wc -l)
CSS_COUNT=$(curl -s https://linkchest.cn/ | grep -oE '"/_next/static/[^"]*\.css"' | wc -l)
echo "  JS 资源数: ${JS_COUNT}"
echo "  CSS 资源数: ${CSS_COUNT}"

echo ""
echo "🔍 是否走 Cloudflare？"
curl -sI https://linkchest.cn/ | grep -iE 'cf-|cloudflare|server|cdn|fastly'
