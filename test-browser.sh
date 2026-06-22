#!/bin/bash
# 模拟浏览器：6 并发，带 gzip
echo "=== 模拟浏览器：6 并发请求（带 gzip）==="

# 取 12 个静态资源，分 2 批（每批 6 并发）
RESOURCES=$(curl -s https://linkchest.cn/ | grep -oE '"/_next/static/[^"]+\.(js|css)"' | sort -u | head -12 | tr -d '"')

# 写入临时文件，每行一个 URL
> /tmp/urls.txt
for r in $RESOURCES; do
  echo "https://linkchest.cn${r}" >> /tmp/urls.txt
done

echo "下载 ${COUNT} 个资源 (6 并发):"
echo ""

# 6 并发下载
START=$(date +%s%N)
xargs -P 6 -I {} curl -s -H 'Accept-Encoding: gzip' -o /dev/null -w "{} : %{time_total}s\n" {} < /tmp/urls.txt
END=$(date +%s%N)
echo ""
echo "  实际总耗时: $(( (END - START) / 1000000 ))ms"
