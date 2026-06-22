#!/bin/bash
# 检查 keystore MD5

cert_file="/tmp/linkchest_cert.der"

# 导出证书
keytool -exportcert -alias linkchest -keystore "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore" -storepass "LCHu192619!" -file "$cert_file"

# 计算 MD5
md5_hash=$(md5sum "$cert_file" | awk '{print $1}')
echo "证书文件 MD5: $md5_hash"

# 从 SHA256 计算 MD5（keytool 的 MD5 是证书公钥的 MD5）
sha256="9B499526CAF730BF6B5B7565466355D014EDB02B89E657E63D44871EC80EF2E7"
md5_from_sha256=$(python3 -c "import hashlib; print(hashlib.md5(bytes.fromhex('$sha256')).hexdigest().upper())")
echo "从 SHA256 计算的 MD5: $md5_from_sha256"
