#!/bin/bash
# 使用微信官方方式计算签名
keystore='/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore'
pass='LCHu192619!'

echo "=== 方法1: SHA256的MD5 ==="
sha256="9B499526CAF730BF6B5B7565466355D014EDB02B89E657E63D44871EC80EF2E7"
python3 -c "import hashlib; print('MD5:', hashlib.md5(bytes.fromhex('$sha256')).hexdigest().upper())"

echo ""
echo "=== 方法2: 证书文件的MD5 ==="
# 导出证书并计算文件MD5
cert_file="/tmp/linkchest_cert.der"
keytool -exportcert -keystore "$keystore" -alias linkchest -storepass "$pass" -file "$cert_file" 2>/dev/null
if [ -f "$cert_file" ]; then
    echo "证书文件MD5:"
    md5sum "$cert_file"
    echo ""
    echo "证书内容十六进制MD5:"
    xxd -p "$cert_file" | tr -d '\n' | python3 -c "import sys, hashlib; data = sys.stdin.read().strip(); print('MD5:', hashlib.md5(bytes.fromhex(data)).hexdigest().upper())"
fi

echo ""
echo "=== 方法3: 公钥的MD5 ==="
# 提取公钥
pubkey_file="/tmp/linkchest_pubkey.pem"
openssl x509 -in "$cert_file" -pubkey -noout > "$pubkey_file" 2>/dev/null
if [ -f "$pubkey_file" ]; then
    echo "公钥文件MD5:"
    md5sum "$pubkey_file"
    echo ""
    echo "公钥内容（去掉头尾）MD5:"
    grep -v 'PUBLIC KEY' "$pubkey_file" | base64 -d | xxd -p | tr -d '\n' | python3 -c "import sys, hashlib; data = sys.stdin.read().strip(); print('MD5:', hashlib.md5(bytes.fromhex(data)).hexdigest().upper())"
fi

echo ""
echo "=== 方法4: 整个keystore文件的MD5 ==="
md5sum "$keystore"

# 清理
rm -f "$cert_file" "$pubkey_file"
