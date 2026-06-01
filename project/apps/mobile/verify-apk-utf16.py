import os
import zipfile

APK = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606011430.apk"
EXTRACT_DIR = "/tmp/apk-contents-new"

BUNDLE = os.path.join(EXTRACT_DIR, "assets/index.android.bundle")
with open(BUNDLE, "rb") as f:
    data = f.read()

# UTF-16LE encoding
utf16_searches = [
    (b'\xae\x5f\xe1\x4f\x7b\x76\x55\x5f', '微信登录 (UTF-16LE)'),
    (b'\x94\x5e\x68\x75\x9d\x5b', '应用宝 (UTF-16LE)'),
    (b'\x13\x4e\x1a\x4e\x89\x88', '专业版 (UTF-16LE)'),
    (b'\x67\x65d\x30\x88\x70\x88', '旗舰版 (UTF-16LE)'),
    (b'tier.pro', 'tier.pro'),
    (b'"Pro"', '"Pro"'),
    (b'"Ultimate"', '"Ultimate"'),
    (b'\x2e\x63n', 'linkchest.cn (partial)'),
]

print("=== UTF-16LE 编码搜索 ===")
for s, name in utf16_searches:
    count = data.count(s)
    status = "FOUND" if count > 0 else "NOT FOUND"
    print(f"{name}: {status} (count: {count})")

# More precise UTF-16LE strings
print("\n=== 精确 UTF-16LE 字符串 ===")
print("微信:", data.count(b'\xae\x5f\xe1\x4f'))
print("登录:", data.count(b'\x7b\x76\x55\x5f'))
print("应用:", data.count(b'\x94\x5e\x68'))
print("宝:", data.count(b'\x9d\x5b'))
print("专业:", data.count(b'\x13\x4e\x1a\x4e'))
print("旗舰:", data.count(b'\x67\x65\x30\x88'))
