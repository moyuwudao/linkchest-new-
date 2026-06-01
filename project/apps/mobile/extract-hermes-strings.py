import struct

BUNDLE = "/tmp/apk-contents/assets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    data = f.read()

# Hermes bytecode header:
# - Magic: 4 bytes (0x1F 0xBC 0x03 0xC6 for Hermes)
# - Version: 4 bytes
# - ...

magic = data[:4]
print(f"Magic: {magic.hex()}")

if magic != b'\xc6\x03\xbc\x1f':
    print("Not a Hermes bytecode file!")
    exit(1)

# Try to find strings by looking for UTF-8 encoded Chinese characters
# Search for common patterns
searches = [
    b'\xe5\xbe\xae\xe4\xbf\xa1\xe7\x99\xbb\xe5\xbd\x95',  # 微信登录 (UTF-8)
    b'\xe5\xba\x94\xe7\x94\xa8\xe5\xae\x9d',  # 应用宝 (UTF-8)
    b'\xe9\x93\xbe\xe8\x97\x8f',  # 链藏 (UTF-8)
    b'tier.pro',
    b'Pro',
    b'Ultimate',
    b'linkchest.cn',
    b'linkchest.net',
]

print("\n=== UTF-8 字符串搜索 ===")
for s in searches:
    count = data.count(s)
    status = "FOUND" if count > 0 else "NOT FOUND"
    print(f"{s.decode('utf-8', errors='replace')}: {status} (count: {count})")

# Also search for ASCII strings that might be Pro
print("\n=== ASCII 搜索 ===")
print(f"'tier.pro': {data.count(b'tier.pro')}")
print(f"'Pro': {data.count(b'Pro')}")
print(f"'Ultimate': {data.count(b'Ultimate')}")
