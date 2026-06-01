import os
import zipfile

APK = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606011430.apk"
EXTRACT_DIR = "/tmp/apk-contents-new"

# Extract APK
os.makedirs(EXTRACT_DIR, exist_ok=True)
with zipfile.ZipFile(APK, 'r') as z:
    z.extractall(EXTRACT_DIR)

BUNDLE = os.path.join(EXTRACT_DIR, "assets/index.android.bundle")
with open(BUNDLE, "rb") as f:
    data = f.read()

searches = [
    (b'\xe5\xbe\xae\xe4\xbf\xa1\xe7\x99\xbb\xe5\xbd\x95', '微信登录'),
    (b'\xe5\xba\x94\xe7\x94\xa8\xe5\xae\x9d', '应用宝'),
    (b'\xe4\xb8\x93\xe4\xb8\x9a\xe7\x89\x88', '专业版'),
    (b'\xe6\x97\x97\xe8\x88\xb0\xe7\x89\x88', '旗舰版'),
    (b'tier.pro', 'tier.pro'),
    (b'Pro', 'Pro'),
    (b'Ultimate', 'Ultimate'),
    (b'linkchest.cn', 'linkchest.cn'),
    (b'linkchest.net', 'linkchest.net'),
    (b'Google Sign-In', 'Google Sign-In'),
]

print("=== 新 APK 验证 ===")
for s, name in searches:
    count = data.count(s)
    status = "FOUND" if count > 0 else "NOT FOUND"
    print(f"{name}: {status} (count: {count})")
