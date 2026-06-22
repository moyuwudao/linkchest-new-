#!/bin/bash
keystores=(
  "/mnt/d/trae_projects/linkchest/backup-20260610-2038/linkchest-release.keystore"
  "/mnt/d/trae_projects/linkchest/backup-20260610-2038/debug.keystore"
  "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
  "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/debug.keystore"
)

for keystore in "${keystores[@]}"; do
  echo "=== $keystore ==="
  if [ -f "$keystore" ]; then
    # 获取所有别名
    aliases=$(keytool -list -keystore "$keystore" -storepass 'LCHu192619!' 2>/dev/null | grep -E '^[a-zA-Z]' | awk '{print $1}')
    for alias in $aliases; do
      echo "Alias: $alias"
      keytool -list -v -keystore "$keystore" -alias "$alias" -storepass 'LCHu192619!' 2>/dev/null | grep -E '(SHA256|MD5|SHA1)' | head -3
      echo ""
    done
  else
    echo "文件不存在"
    echo ""
  fi
done
