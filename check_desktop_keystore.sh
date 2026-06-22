#!/bin/bash
# 检查 Desktop 原始文件
echo "=== Desktop 原始文件 ==="
keytool -list -v -keystore '/mnt/c/Users/Mayn/Desktop/重要文档/SSH/linkchest/linkchest-release.keystore' -alias linkchest -storepass 'LCHu192619!' | grep -E '(SHA256|SHA1)'

# 计算 MD5
echo ""
echo "=== 计算 MD5 ==="
sha256="9B499526CAF730BF6B5B7565466355D014EDB02B89E657E63D44871EC80EF2E7"
python3 << EOF
import hashlib
md5 = hashlib.md5(bytes.fromhex("$sha256")).hexdigest().upper()
print("MD5:", md5)
print("目标MD5: 532FD00CDFE8E47071536704767B85FD")
print("匹配:", md5 == "532FD00CDFE8E47071536704767B85FD")
EOF
