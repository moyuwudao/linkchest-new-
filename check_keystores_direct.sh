#!/bin/bash
keystores=(
  "/mnt/d/trae_projects/linkchest/backup-20260610-2038/linkchest-release.keystore"
  "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
)

for keystore in "${keystores[@]}"; do
  echo "=== $keystore ==="
  if [ -f "$keystore" ]; then
    keytool -list -v -keystore "$keystore" -alias "linkchest" -storepass 'LCHu192619!' 2>/dev/null | grep -E '(SHA256|MD5|SHA1)' | head -3
    echo ""
  else
    echo "文件不存在"
    echo ""
  fi
done

echo "=== debug.keystore ==="
keytool -list -v -keystore "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/debug.keystore" -alias "androiddebugkey" -storepass 'android' 2>/dev/null | grep -E '(SHA256|MD5|SHA1)' | head -3
