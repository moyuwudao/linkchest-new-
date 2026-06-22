#!/bin/bash
# 搜索所有可能的 keystore 文件位置

echo "=== 搜索所有 .keystore 和 .jks 文件 ==="
find /mnt/d/trae_projects /mnt/c/Users/Mayn -name '*.keystore' -o -name '*.jks' 2>/dev/null | while read f; do
  echo "Found: $f"
done

echo ""
echo "=== 搜索包含 'linkchest' 的证书文件 ==="
find /mnt/d/trae_projects /mnt/c/Users/Mayn -name '*linkchest*' -type f 2>/dev/null | grep -E '\.(keystore|jks|cer|crt|pem|p12)$' | while read f; do
  echo "Found: $f"
done

echo ""
echo "=== 检查 git 历史中的 keystore ==="
cd /mnt/d/trae_projects/linkchest
git log --all --full-history -- '*.keystore' '*.jks' --oneline 2>/dev/null | head -5

echo ""
echo "=== 检查是否有其他别名 ==="
for keystore in /mnt/d/trae_projects/linkchest/backup-20260610-2038/linkchest-release.keystore /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore; do
  if [ -f "$keystore" ]; then
    echo "=== $keystore ==="
    keytool -list -keystore "$keystore" -storepass 'LCHu192619!' 2>/dev/null | grep -v '^$'
    echo ""
  fi
done
