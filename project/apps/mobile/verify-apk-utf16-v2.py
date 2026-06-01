import os

BUNDLE = "/tmp/apk-contents-new/assets/index.android.bundle"
with open(BUNDLE, "rb") as f:
    data = f.read()

# Check individual characters
chars = {
    '微': b'\xae\x5f',
    '信': b'\xe1\x4f',
    '登': b'\x7b\x76',
    '录': b'\x55\x5f',
    '应': b'\x94\x5e',
    '用': b'\x68\x75',
    '宝': b'\x9d\x5b',
    '专': b'\x13\x4e',
    '业': b'\x1a\x4e',
    '旗': b'\x67\x65',
    '舰': b'\xd0\x82',  # 舰 = \u8230
    '版': b'\x48\x72',
}

print("=== 单字 UTF-16LE 搜索 ===")
for name, seq in chars.items():
    count = data.count(seq)
    print(f"{name}: {count}")

# Search for 应用宝
print("\n=== 应用宝 ===")
print("应用:", data.count(b'\x94\x5e\x68\x75'))
print("用宝:", data.count(b'\x68\x75\x9d\x5b'))

# Search for 专业版
print("\n=== 专业版 ===")
print("专业:", data.count(b'\x13\x4e\x1a\x4e'))
print("业版:", data.count(b'\x1a\x4e\x48\x72'))

# Search for 旗舰版
print("\n=== 旗舰版 ===")
print("旗舰:", data.count(b'\x67\x65\xd0\x82'))
print("舰版:", data.count(b'\xd0\x82\x48\x72'))
