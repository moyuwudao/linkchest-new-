import re

BUNDLE = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

print("=== 检查键值对 ===")
print('"pro":"Pro":', content.count('"pro":"Pro"'))
print('"super":"Ultimate":', content.count('"super":"Ultimate"'))
print('"perMonth":"/mo":', content.count('"perMonth":"/mo"'))
print('"tierManagement":"Plan Management":', content.count('"tierManagement":"Plan Management"'))
print('"notSubscribed":"Not Subscribed":', content.count('"notSubscribed":"Not Subscribed"'))

# Check if the old version without pro/super exists
print('\n=== 检查旧版本 tier 对象 ===')
# Look for tier object ending without pro/super
idx = content.find('"tier":')
if idx >= 0:
    print("Found 'tier' object at", idx)
    print("Context:", repr(content[idx:idx+500]))
else:
    print("'tier' object not found directly")
