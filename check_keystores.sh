#!/bin/bash
keystores=(
  "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore.backup."
  "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
  "/mnt/d/trae_projects/linkchest/backup-20260610-2038/linkchest-release.keystore"
)

for keystore in "${keystores[@]}"; do
  echo "=== $keystore ==="
  if [ -f "$keystore" ]; then
    keytool -list -v -keystore "$keystore" -alias linkchest -storepass 'LCHu192619!' 2>/dev/null | grep -A1 'SHA256' | head -2
    echo ""
  else
    echo "文件不存在"
    echo ""
  fi
done
