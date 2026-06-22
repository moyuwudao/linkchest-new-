#!/bin/bash
# 从备案私钥生成 keystore

PRIVATE_KEY="/mnt/c/Users/Mayn/Desktop/重要文档/SSH/linkchest/linkchest_cn.pem"
OUTPUT_KEYSTORE="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
ALIAS="linkchest"
STOREPASS="LCHu192619!"
KEYPASS="LCHu192619!"
VALIDITY=10000

echo "=== 从备案私钥生成 keystore ==="

# 1. 从私钥提取公钥
openssl rsa -in "$PRIVATE_KEY" -pubout -out /tmp/public_key.pem

# 2. 生成自签名证书（使用短名称）
openssl req -new -x509 -key "$PRIVATE_KEY" -out /tmp/certificate.crt -days $VALIDITY -subj "/CN=linkchest/OU=linkchest/O=linkchest/L=Beijing/ST=Beijing/C=CN"

# 3. 创建 PKCS12
openssl pkcs12 -export -in /tmp/certificate.crt -inkey "$PRIVATE_KEY" -out /tmp/linkchest.p12 -name "$ALIAS" -password pass:$STOREPASS

# 4. 转换为 JKS (Java KeyStore) - 自动确认覆盖
keytool -importkeystore -srckeystore /tmp/linkchest.p12 -srcstoretype PKCS12 -srcstorepass $STOREPASS -destkeystore "$OUTPUT_KEYSTORE" -deststoretype JKS -deststorepass $STOREPASS -alias "$ALIAS" -destkeypass $KEYPASS -noprompt

echo "=== keystore 生成完成 ==="
echo "文件: $OUTPUT_KEYSTORE"

# 5. 验证签名
keytool -list -v -keystore "$OUTPUT_KEYSTORE" -alias "$ALIAS" -storepass $STOREPASS | grep -A1 "SHA256"

echo "=== 清理临时文件 ==="
rm -f /tmp/public_key.pem /tmp/certificate.crt /tmp/linkchest.p12
