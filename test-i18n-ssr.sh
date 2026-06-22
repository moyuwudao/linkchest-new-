#!/bin/bash
echo "=== Test 1: linkchest.cn SSR lang attribute (NO cookie) ==="
curl -s https://linkchest.cn/ | grep -oE '<html[^>]+>' | head -1
echo ""

echo "=== Test 2: linkchest.cn SSR lang attribute (with zh cookie) ==="
curl -s -H 'Cookie: linkchest-locale=zh' https://linkchest.cn/ | grep -oE '<html[^>]+>' | head -1
echo ""

echo "=== Test 3: linkchest.cn SSR lang attribute (with en cookie) ==="
curl -s -H 'Cookie: linkchest-locale=en' https://linkchest.cn/ | grep -oE '<html[^>]+>' | head -1
echo ""

echo "=== Test 4: linkchest.net (海外域名) SSR lang attribute ==="
curl -s https://linkchest.net/ | grep -oE '<html[^>]+>' | head -1
echo ""

echo "=== Test 5: 主页文案（第一次中文字符检测）==="
echo "Test 1: NO cookie"
curl -s https://linkchest.cn/ | grep -oE '链藏|LinkChest|跨平台收藏聚合' | head -3
echo "Test 2: with en cookie"
curl -s -H 'Cookie: linkchest-locale=en' https://linkchest.cn/ | grep -oE '链藏|LinkChest|across platforms|Bookmark' | head -3
