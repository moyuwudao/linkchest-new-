#!/bin/bash
# 验证新APK签名
new_apk="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-fresh/outputs/apk/china/release/linkchest-china-release.apk"
keystore_file="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"

echo "=== 新APK签名验证 ==="
unzip -p "$new_apk" META-INF/CERT.RSA > /tmp/new_apk_cert.rsa 2>/dev/null
if [ -f /tmp/new_apk_cert.rsa ]; then
    keytool -printcert -file /tmp/new_apk_cert.rsa | grep -E '(SHA1|SHA256|MD5)'
    
    echo ""
    echo "APK 证书 MD5:"
    md5sum /tmp/new_apk_cert.rsa
else
    echo "未找到证书文件"
fi

echo ""
echo "=== keystore 证书 ==="
keytool -exportcert -keystore "$keystore_file" -alias linkchest -storepass 'LCHu192619!' -file /tmp/keystore_cert.der 2>/dev/null
if [ -f /tmp/keystore_cert.der ]; then
    echo "keystore 证书 MD5:"
    md5sum /tmp/keystore_cert.der
fi

echo ""
echo "=== 对比 ==="
apk_md5=$(md5sum /tmp/new_apk_cert.rsa 2>/dev/null | awk '{print $1}')
keystore_md5=$(md5sum /tmp/keystore_cert.der 2>/dev/null | awk '{print $1}')

echo "APK MD5:     $apk_md5"
echo "keystore MD5: $keystore_md5"

if [ "$apk_md5" = "$keystore_md5" ]; then
    echo ""
    echo "✅ 签名匹配！"
else
    echo ""
    echo "❌ 签名不匹配！"
fi

# 清理
rm -f /tmp/new_apk_cert.rsa /tmp/keystore_cert.der
