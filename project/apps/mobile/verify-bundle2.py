import re

BUNDLE = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

print("=== 验证 i18n 翻译内容 ===")
print("perMonth:", len(re.findall(r'perMonth', content)))
print('"/mo":', len(re.findall(r'"/mo"', content)))
print("tierManagement:", len(re.findall(r'tierManagement', content)))
print('"Plan Management":', len(re.findall(r'"Plan Management"', content)))
print("notSubscribed:", len(re.findall(r'notSubscribed', content)))
print('"Not Subscribed":', len(re.findall(r'"Not Subscribed"', content)))
print('"Pro" (alone):', len(re.findall(r'"Pro"', content)))
print('"Ultimate" (alone):', len(re.findall(r'"Ultimate"', content)))

# 查找 tier 对象区域
idx = content.find('perMonth')
if idx >= 0:
    print("\n=== tier 对象上下文 ===")
    print(content[max(0, idx-200):idx+200])
