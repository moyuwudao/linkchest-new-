import os
import zipfile

APK = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606011430.apk"
EXTRACT_DIR = "/tmp/apk-contents-new"

BUNDLE = os.path.join(EXTRACT_DIR, "assets/index.android.bundle")
with open(BUNDLE, "rb") as f:
    data = f.read()

# UTF-8 encoding
utf8_searches = [
    (b'\xe5\xbe\xae\xe4\xbf\xa1\xe7\x99\xbb\xe5\xbd\x95', '微信登录 (UTF-8)'),
    (b'\xe5\xba\x94\xe7\x94\xa8\xe5\xae\x9d', '应用宝 (UTF-8)'),
    (b'\xe4\xb8\x93\xe4\xb8\x9a\xe7\x89\x88', '专业版 (UTF-8)'),
    (b'\xe6\x97\x97\xe8\x88\xb0\xe7\x89\x88', '旗舰版 (UTF-8)'),
]

# UTF-16LE encoding
utf16_searches = [
    (b'\xae\x5f\xe1\x4f\x7b\x76\x55\x5f', '微信登录 (UTF-16LE)'),
    (b'\x94\x5e\x68\x75\x9d\x5b', '应用宝 (UTF-16LE)'),
]

print("=== UTF-8 搜索 ===")
for s, name in utf8_searches:
    count = data.count(s)
    status = "FOUND" if count > 0 else "NOT FOUND"
    print(f"{name}: {status} (count: {count})")

print("\n=== UTF-16LE 搜索 ===")
for s, name in utf16_searches:
    count = data.count(s)
    status = "FOUND" if count > 0 else "NOT FOUND"
    print(f"{name}: {status} (count: {count})")

# Also try to decode some portions of the data to see if there are any Chinese characters
print("\n=== 尝试解码数据片段 ===")
for i in range(0, len(data) - 100, 10000):
    try:
        decoded = data[i:i+200].decode('utf-16-le', errors='ignore')
        if any('\u4e00' <= c <= '\u9fff' for c in decoded):
            print(f"Found Chinese chars at offset {i}: {decoded[:50]}")
    except:
        pass
