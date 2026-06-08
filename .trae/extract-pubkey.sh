#!/bin/bash
set -e

KEYSTORE="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
PASSWORD='LCHu192619!'

# 重新导出
keytool -exportcert -alias linkchest -keystore "$KEYSTORE" -storepass "$PASSWORD" -file /tmp/linkchest.cer > /dev/null 2>&1

# 1. PEM 完整公钥 (PKCS#8 / SubjectPublicKeyInfo)
echo "=== 1. PEM SubjectPublicKeyInfo (标准) ==="
openssl x509 -in /tmp/linkchest.cer -pubkey -noout

# 2. PEM PKCS#1 (裸 RSA)
echo ""
echo "=== 2. PEM PKCS#1 (裸 RSA) ==="
openssl x509 -in /tmp/linkchest.cer -pubkey -noout | openssl rsa -pubin -RSAPublicKey_out 2>/dev/null

# 3. 模数 n 的十六进制
echo ""
echo "=== 3. Modulus (n) HEX 字符串 ==="
openssl x509 -in /tmp/linkchest.cer -pubkey -noout | openssl rsa -pubin -modulus -noout 2>/dev/null | sed 's/Modulus=//' | tr 'A-Z' 'a-z'

# 4. 模数 n 的十进制
echo ""
echo "=== 4. Modulus (n) 十进制字符串 ==="
HEX_N=$(openssl x509 -in /tmp/linkchest.cer -pubkey -noout | openssl rsa -pubin -modulus -noout 2>/dev/null | sed 's/Modulus=//' | tr 'A-Z' 'a-z')
python3 -c "n = int('$HEX_N', 16); print(n)"

# 5. SubjectPublicKeyInfo DER 的十六进制
echo ""
echo "=== 5. SubjectPublicKeyInfo DER HEX ==="
openssl x509 -in /tmp/linkchest.cer -pubkey -noout | grep -v -E 'PUBLIC KEY|END' | tr -d '\n' | base64 -d 2>/dev/null | xxd -p -c 999

# 6. 指数 e
echo ""
echo "=== 6. Exponent (e) ==="
openssl x509 -in /tmp/linkchest.cer -pubkey -noout | openssl rsa -pubin -text -noout 2>/dev/null | grep -E 'Exponent|Modulus' -A1
