#!/bin/bash
# 检查APK构建类型和签名
apk="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606171247.apk"

echo "=== APK 构建信息 ==="
# 检查AndroidManifest.xml
unzip -p "$apk" AndroidManifest.xml > /tmp/apk_manifest.xml 2>/dev/null
if [ -f /tmp/apk_manifest.xml ]; then
    echo "AndroidManifest.xml 存在"
fi

# 检查签名文件
echo ""
echo "=== APK 签名文件 ==="
unzip -l "$apk" | grep -E 'META-INF|\.RSA|\.DSA|\.SF'

# 重新构建并检查
echo ""
echo "=== 重新构建 release APK ==="
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 清理之前的构建
./gradlew clean --no-daemon 2>/dev/null

# 构建 release
./gradlew assembleChinaRelease --no-daemon 2>/dev/null

# 检查新生成的APK
new_apk="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-release.apk"
if [ -f "$new_apk" ]; then
    echo ""
    echo "=== 新APK签名 ==="
    unzip -p "$new_apk" META-INF/*.RSA > /tmp/new_apk_cert.rsa 2>/dev/null
    if [ -f /tmp/new_apk_cert.rsa ]; then
        keytool -printcert -file /tmp/new_apk_cert.rsa | grep -E '(SHA1|SHA256|MD5)'
        echo ""
        echo "新APK证书MD5:"
        md5sum /tmp/new_apk_cert.rsa
    fi
fi

# 清理
rm -f /tmp/apk_manifest.xml /tmp/new_apk_cert.rsa
