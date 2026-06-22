#!/bin/bash
# 检查所有发现的 linkchest keystore

keystores=(
  "/mnt/c/Users/Mayn/Desktop/linkchest-release.keystore"
  "/mnt/c/Users/Mayn/Desktop/重要文档/SSH/linkchest/linkchest-release.keystore"
  "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
  "/mnt/d/trae_projects/linkchest/backup-20260610-2038/linkchest-release.keystore"
)

echo "=== 检查所有 linkchest keystore ==="
for keystore in "${keystores[@]}"; do
  if [ -f "$keystore" ]; then
    echo "=== $keystore ==="
    keytool -list -v -keystore "$keystore" -alias "linkchest" -storepass 'LCHu192619!' 2>/dev/null | grep -E '(SHA256|MD5|SHA1|Alias|Entry)'
    echo ""
  fi
done

echo "=== 检查其他可能的别名 ==="
for keystore in "${keystores[@]}"; do
  if [ -f "$keystore" ]; then
    echo "=== $keystore (所有别名) ==="
    keytool -list -keystore "$keystore" -storepass 'LCHu192619!' 2>/dev/null | grep -E 'PrivateKeyEntry'
    echo ""
  fi
done

echo "=== 检查 linkchest.cer 证书 ==="
if [ -f "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest.cer" ]; then
  keytool -printcert -file "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest.cer" | grep -E '(SHA256|MD5|SHA1)'
fi

echo ""
echo "=== 检查 linkchest_cn.pem (私钥对应的公钥) ==="
if [ -f "/mnt/c/Users/Mayn/Desktop/重要文档/SSH/linkchest/linkchest_cn.pem" ]; then
  openssl rsa -in "/mnt/c/Users/Mayn/Desktop/重要文档/SSH/linkchest/linkchest_cn.pem" -pubout -out /tmp/public_key.pem 2>/dev/null
  if [ -f /tmp/public_key.pem ]; then
    echo "公钥 SHA256:"
    sha256sum /tmp/public_key.pem
    rm -f /tmp/public_key.pem
  fi
fi
