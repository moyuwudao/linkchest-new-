#!/bin/bash
URL="$1"
curl -sL -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' -H 'Referer: https://www.xiaohongshu.com/' "$URL" --max-time 15 > /tmp/xhs.html
echo "=== HTML size: $(wc -c < /tmp/xhs.html) ==="
echo "=== og:title ==="
grep -oE '<meta property="og:title" content="[^"]*"' /tmp/xhs.html | head -1
echo "=== og:image ==="
grep -oE '<meta property="og:image" content="[^"]*"' /tmp/xhs.html | head -1
echo "=== imageList ==="
grep -oE '"imageList":\[[^]]{0,200}' /tmp/xhs.html | head -1
echo "=== title in INITIAL_STATE ==="
grep -oE '"title":"[^"]{1,60}"' /tmp/xhs.html | head -3
echo "=== xhscdn images ==="
grep -oE 'https://[^"]*xhscdn[^"]*\.jpg[^"]*' /tmp/xhs.html | head -3
