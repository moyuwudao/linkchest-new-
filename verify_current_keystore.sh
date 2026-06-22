#!/bin/bash
# 1. 确认备份文件与 Desktop 版本是否一致
echo "=== 1. 对比备份文件与 Desktop 版本 ==="

desktop_sha256=$(keytool -list -v -keystore "/mnt/c/Users/Mayn/Desktop/重要文档/SSH/linkchest/linkchest-release.keystore" -alias linkchest -storepass 'LCHu192619!' 2>/dev/null | grep "SHA256:" | head -1 | awk '{print $2}')
backup_sha256=$(keytool -list -v -keystore "/mnt/d/trae_projects/linkchest/backup-20260610-2038/linkchest-release.keystore" -alias linkchest -storepass 'LCHu192619!' 2>/dev/null | grep "SHA256:" | head -1 | awk '{print $2}')
project_sha256=$(keytool -list -v -keystore "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore" -alias linkchest -storepass 'LCHu192619!' 2>/dev/null | grep "SHA256:" | head -1 | awk '{print $2}')

echo "Desktop SHA256: $desktop_sha256"
echo "Backup SHA256:  $backup_sha256"
echo "Project SHA256: $project_sha256"

if [ "$desktop_sha256" = "$backup_sha256" ]; then
    echo "Desktop == Backup: 一致"
else
    echo "Desktop == Backup: 不一致"
fi

if [ "$desktop_sha256" = "$project_sha256" ]; then
    echo "Desktop == Project: 一致"
else
    echo "Desktop == Project: 不一致"
fi

echo ""
echo "=== 2. 确认 APK 使用哪个 keystore 签名 ==="
apk_sha256=$(keytool -printcert -jarfile /mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606171247.apk 2>/dev/null | grep "SHA256:" | head -1 | awk '{print $2}')
echo "APK SHA256: $apk_sha256"

if [ "$apk_sha256" = "$project_sha256" ]; then
    echo "APK == Project: 一致"
else
    echo "APK == Project: 不一致"
fi

echo ""
echo "=== 3. 计算实际 MD5 ==="
sha256_clean=$(echo "$project_sha256" | tr -d ':')
python3 << EOF
import hashlib
sha256 = "$sha256_clean"
sha256_bytes = bytes.fromhex(sha256)
md5 = hashlib.md5(sha256_bytes).hexdigest().upper()
print("实际 SHA256:", sha256)
print("实际 MD5:", md5)
EOF

echo ""
echo "=== 4. 输出微信配置信息 ==="
python3 << EOF
import hashlib
sha256 = "$sha256_clean"
sha256_bytes = bytes.fromhex(sha256)
md5 = hashlib.md5(sha256_bytes).hexdigest().upper()
print("### 微信配置")
print("- 应用包名 : com.linkchest.app")
print("- 应用签名 : " + md5)
print("- 备用签名 : 未填写")
print("")
print("### 备案信息")
print("- App包名 : com.linkchest.app")
print("- 公钥 : 需要单独获取")
print("- 签名MD5值 : " + md5)
EOF
