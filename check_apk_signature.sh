#!/bin/bash
# 检查APK签名
apk="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606171247.apk"
keystore="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"

echo "=== APK 签名信息 ==="
# 解压证书
unzip -p "$apk" META-INF/*.RSA > /tmp/apk_cert.rsa 2>/dev/null
if [ -f /tmp/apk_cert.rsa ]; then
    keytool -printcert -file /tmp/apk_cert.rsa | grep -E '(SHA1|SHA256|MD5)'
    
    echo ""
    echo "=== APK 证书 MD5 ==="
    md5sum /tmp/apk_cert.rsa
else
    echo "未找到证书文件，尝试其他方式..."
fi

echo ""
echo "=== keystore 证书信息 ==="
keytool -exportcert -keystore "$keystore" -alias linkchest -storepass 'LCHu192619!' -file /tmp/keystore_cert.der 2>/dev/null
if [ -f /tmp/keystore_cert.der ]; then
    md5sum /tmp/keystore_cert.der
fi

echo ""
echo "=== 对比 ==="
echo "APK 证书 MD5:"
md5sum /tmp/apk_cert.rsa 2>/dev/null | awk '{print $1}'
echo "keystore 证书 MD5:"
md5sum /tmp/keystore_cert.der 2>/dev/null | awk '{print $1}'

# 清理
rm -f /tmp/apk_cert.rsa /tmp/keystore_cert.der
