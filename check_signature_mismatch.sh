#!/bin/bash
# 检查APK使用的签名
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 1. 检查debug keystore
debug_keystore="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/debug.keystore"
if [ -f "$debug_keystore" ]; then
    echo "=== debug.keystore 信息 ==="
    keytool -list -v -keystore "$debug_keystore" -alias androiddebugkey -storepass 'android' 2>/dev/null | grep -E '(SHA1|SHA256|MD5)'
    
    echo ""
    echo "debug keystore MD5:"
    keytool -exportcert -keystore "$debug_keystore" -alias androiddebugkey -storepass 'android' -file /tmp/debug_cert.der 2>/dev/null
    md5sum /tmp/debug_cert.der
    rm -f /tmp/debug_cert.der
fi

# 2. 检查APK签名
new_apk="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-fresh/outputs/apk/china/release/linkchest-china-release.apk"
echo ""
echo "=== APK 签名信息 ==="
unzip -p "$new_apk" META-INF/CERT.RSA > /tmp/apk_cert.rsa 2>/dev/null
if [ -f /tmp/apk_cert.rsa ]; then
    keytool -printcert -file /tmp/apk_cert.rsa | grep -E '(SHA1|SHA256|MD5)'
    
    echo ""
    echo "APK 证书 MD5:"
    md5sum /tmp/apk_cert.rsa
fi

# 3. 检查keystore文件
echo ""
echo "=== linkchest-release.keystore 信息 ==="
keystore_file="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
keytool -list -v -keystore "$keystore_file" -alias linkchest -storepass 'LCHu192619!' 2>/dev/null | grep -E '(SHA1|SHA256|MD5)'

echo ""
echo "keystore 证书 MD5:"
keytool -exportcert -keystore "$keystore_file" -alias linkchest -storepass 'LCHu192619!' -file /tmp/keystore_cert.der 2>/dev/null
md5sum /tmp/keystore_cert.der

# 4. 对比
echo ""
echo "=== 对比 ==="
apk_md5=$(md5sum /tmp/apk_cert.rsa 2>/dev/null | awk '{print $1}')
keystore_md5=$(md5sum /tmp/keystore_cert.der 2>/dev/null | awk '{print $1}')

echo "APK MD5:      $apk_md5"
echo "keystore MD5: $keystore_md5"

if [ "$apk_md5" = "$keystore_md5" ]; then
    echo "✅ 签名匹配！"
else
    echo "❌ 签名不匹配！"
    echo ""
    echo "可能原因："
    echo "1. 构建时使用了 debug 签名"
    echo "2. 构建配置被覆盖"
    echo "3. keystore 文件路径错误"
fi

# 清理
rm -f /tmp/apk_cert.rsa /tmp/keystore_cert.der
