import re

BUNDLE = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

print("=== 验证 i18n 翻译 ===")
print("tier.pro 出现次数:", len(re.findall(r'tier\.pro', content)))
print('"pro":"Pro" 出现次数:', len(re.findall(r'"pro":"Pro"', content)))
print('"super":"Ultimate" 出现次数:', len(re.findall(r'"super":"Ultimate"', content)))

print("\n=== 验证协议内容 ===")
print("linkchest.cn 出现次数:", len(re.findall(r'linkchest\.cn', content)))
print("linkchest.net 出现次数:", len(re.findall(r'linkchest\.net', content)))
print("微信登录出现次数:", len(re.findall(r'微信登录', content)))
print("Google 登录出现次数:", len(re.findall(r'Google 登录', content)))
print("应用宝出现次数:", len(re.findall(r'应用宝', content)))
