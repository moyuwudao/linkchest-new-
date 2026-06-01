import os

BUNDLE = "/tmp/apk-contents-new/assets/index.android.bundle"
with open(BUNDLE, "rb") as f:
    data = f.read()

# Search for tier.pro and tier.super keys
print("=== tier 键搜索 ===")
print('tier.pro:', data.count(b'tier.pro'))
print('tier.super:', data.count(b'tier.super'))

# Search for the translated values in UTF-16LE
print("\n=== UTF-16LE tier 值搜索 ===")
print('专 (tier.pro 应该是专业版):', data.count(b'\x13\x4e'))
print('业:', data.count(b'\x1a\x4e'))
print('旗 (tier.super 应该是旗舰版):', data.count(b'\x67\x65'))
print('舰:', data.count(b'\xd0\x82'))

# Check if "Pro" is in the bundle
print("\n=== ASCII tier 值搜索 ===")
print('Pro:', data.count(b'Pro'))
print('pro:', data.count(b'pro'))
print('Ultimate:', data.count(b'Ultimate'))
print('ultimate:', data.count(b'ultimate'))

# Find context around tier.pro
idx = data.find(b'tier.pro')
if idx >= 0:
    print(f"\n=== tier.pro 上下文 ===")
    # Extract a window around the match
    start = max(0, idx - 50)
    end = min(len(data), idx + 100)
    context = data[start:end]
    print(f"Context bytes: {context[:50].hex()}")
