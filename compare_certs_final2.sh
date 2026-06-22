#!/bin/bash
# 使用正确的X509 DER验证方式

apk="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-fresh/outputs/apk/china/release/linkchest-china-release.apk"
keystore="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"

echo "=== 1. APK 证书 (META-INF/CERT.RSA) ==="
unzip -p "$apk" META-INF/CERT.RSA > /tmp/apk_cert.rsa 2>/dev/null
ls -la /tmp/apk_cert.rsa

echo ""
echo "=== 2. 从APK证书提取X509证书 ==="
openssl pkcs7 -in /tmp/apk_cert.rsa -inform DER -print_certs -out /tmp/apk_x509.pem 2>/dev/null
if [ -f /tmp/apk_x509.pem ]; then
    echo "X509证书提取成功"
    # 计算X509证书的MD5
    openssl x509 -in /tmp/apk_x509.pem -outform DER > /tmp/apk_x509.der 2>/dev/null
    echo "APK X509 DER MD5:"
    md5sum /tmp/apk_x509.der
fi

echo ""
echo "=== 3. keystore 证书 ==="
keytool -exportcert -keystore "$keystore" -alias linkchest -storepass 'LCHu192619!' -file /tmp/keystore_cert.der 2>/dev/null
echo "keystore DER MD5:"
md5sum /tmp/keystore_cert.der

echo ""
echo "=== 4. 对比DER文件 ==="
if [ -f /tmp/apk_x509.der ] && [ -f /tmp/keystore_cert.der ]; then
    echo "APK DER 大小:"
    ls -la /tmp/apk_x509.der
    echo "keystore DER 大小:"
    ls -la /tmp/keystore_cert.der
    
    echo ""
    echo "对比两个文件是否相同:"
    diff /tmp/apk_x509.der /tmp/keystore_cert.der && echo "✅ 文件相同" || echo "❌ 文件不同"
fi

echo ""
echo "=== 5. SHA1对比 ==="
echo "APK SHA1:"
keytool -printcert -file /tmp/apk_cert.rsa | grep SHA1
echo "keystore SHA1:"
keytool -printcert -file /tmp/keystore_cert.der | grep SHA1

echo ""
echo "=== 6. SHA256对比 ==="
echo "APK SHA256:"
keytool -printcert -file /tmp/apk_cert.rsa | grep SHA256
echo "keystore SHA256:"
keytool -printcert -file /tmp/keystore_cert.der | grep SHA256

# 清理
rm -f /tmp/apk_cert.rsa /tmp/apk_x509.pem /tmp/apk_x509.der /tmp/keystore_cert.der
