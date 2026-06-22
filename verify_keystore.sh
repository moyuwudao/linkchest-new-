#!/bin/bash
keystore='/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore'
pass='LCHu192619!'

echo "=== 证书指纹 ==="
keytool -list -v -keystore "$keystore" -alias linkchest -storepass "$pass" 2>/dev/null | grep -E '(SHA1|SHA256|MD5)'

echo ""
echo "=== 文件 MD5 ==="
md5sum "$keystore"

echo ""
echo "=== 对比你提供的信息 ==="
echo "你提供的证书 MD5: 532fd00cdfe8e47071536704767b85fd"
echo "你提供的 SHA1:     D2:DA:A1:12:F3:5D:9D:22:6A:2E:08:08:BE:DC:2F:8A:0E:41:B2:D2"
echo "你提供的 SHA256:   9B:49:95:26:CA:F7:30:BF:6B:5B:75:65:46:63:55:D0:14:ED:B0:2B:89:E6:57:E6:3D:44:87:1E:C8:0E:F2:E7"
