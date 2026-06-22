import hashlib

# 微信开放平台签名计算方式
# 从 SHA256 证书指纹计算 MD5

sha256_hex = '9B499526CAF730BF6B5B7565466355D014EDB02B89E657E63D44871EC80EF2E7'
sha256_bytes = bytes.fromhex(sha256_hex)

# 方式1: 直接对 SHA256 字节数组计算 MD5
md5_direct = hashlib.md5(sha256_bytes).hexdigest().upper()
print(f"方式1 - 直接MD5(SHA256_bytes): {md5_direct}")

# 方式2: 对 SHA256 字符串（无冒号）计算 MD5
md5_string = hashlib.md5(sha256_hex.encode()).hexdigest().upper()
print(f"方式2 - MD5(SHA256字符串): {md5_string}")

# 方式3: 对 SHA256 字符串（有冒号）计算 MD5
sha256_with_colons = '9B:49:95:26:CA:F7:30:BF:6B:5B:75:65:46:63:55:D0:14:ED:B0:2B:89:E6:57:E6:3D:44:87:1E:C8:0E:F2:E7'
md5_colons = hashlib.md5(sha256_with_colons.encode()).hexdigest().upper()
print(f"方式3 - MD5(SHA256带冒号): {md5_colons}")

# 方式4: 微信官方方式 - 对证书内容计算 MD5（不对，应该是上面的方式1）
print(f"\n微信配置签名: 532FD00CDFE8E47071536704767B85FD")
print(f"APK实际签名MD5: {md5_direct}")
print(f"匹配: {md5_direct == '532FD00CDFE8E47071536704767B85FD'}")
