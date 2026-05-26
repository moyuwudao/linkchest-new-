#!/bin/bash
WORKER="https://linkchest-metadata.lvmeta.workers.dev"

echo "=== 1. Twitter/X ==="
curl -s "${WORKER}/?url=https://x.com/5chmatme/status/2059038556920705143&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 2. 微博用户 ==="
curl -s "${WORKER}/?url=https://weibo.com/u/1496814565&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 3. 知乎文章 ==="
curl -s "${WORKER}/?url=https://zhuanlan.zhihu.com/p/1985387337123919623&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 4. 抖音用户 ==="
curl -s "${WORKER}/?url=https://www.douyin.com/user/MS4wLjABAAAAmpm9E4hAWycI3NaA6d8GTIeW79kGnwNaTbhG1nxpWUo&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 5. 小红书 ==="
curl -s "${WORKER}/?url=https://www.xiaohongshu.com/explore/6a0458e80000000007011ca7&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 6. B站 ==="
curl -s "${WORKER}/?url=https://www.bilibili.com/video/BV1YdGB6aEwU/&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 7. YouTube ==="
curl -s "${WORKER}/?url=https://www.youtube.com/watch?v=yBnp6o32ZkU&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 8. 快手 ==="
curl -s "${WORKER}/?url=https://www.kuaishou.com/short-video/3xbkrubrwc956bc&_t=$(date +%s)" | python3 -m json.tool
echo ""

echo "=== 9. 抖音精选 ==="
curl -s "${WORKER}/?url=https://www.douyin.com/jingxuan?modal_id=7642724642762788132&_t=$(date +%s)" | python3 -m json.tool
echo ""
