#!/bin/bash
# 提取公钥
keystore="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
alias="linkchest"
storepass="LCHu192619!"

echo "=== 提取公钥 ==="
# 导出证书
cert_file="/tmp/linkchest_cert.pem"
keytool -exportcert -keystore "$keystore" -alias "$alias" -storepass "$storepass" -rfc -file "$cert_file" 2>/dev/null

# 提取公钥
pubkey_file="/tmp/linkchest_pubkey.pem"
openssl x509 -in "$cert_file" -pubkey -noout > "$pubkey_file" 2>/dev/null

# 输出公钥内容
echo "公钥内容:"
cat "$pubkey_file"

# 计算公钥的十六进制（用于备案）
echo ""
echo "=== 公钥十六进制（备案格式） ==="
openssl x509 -in "$cert_file" -pubkey -noout 2>/dev/null | grep -v 'PUBLIC KEY' | base64 -d 2>/dev/null | xxd -p | tr -d '\n'

# 清理
rm -f "$cert_file" "$pubkey_file"
