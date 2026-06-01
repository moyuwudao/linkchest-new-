import re

BUNDLE = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

# Search for context around perMonth
idx = content.find('perMonth')
if idx >= 0:
    print("=== perMonth context ===")
    print(repr(content[max(0, idx-100):idx+100]))
    print()

# Search for context around tierManagement
idx = content.find('tierManagement')
if idx >= 0:
    print("=== tierManagement context ===")
    print(repr(content[max(0, idx-100):idx+100]))
    print()

# Search for any occurrence of "/mo"
idx = content.find('/mo')
if idx >= 0:
    print("=== /mo context ===")
    print(repr(content[max(0, idx-100):idx+100]))
    print()
else:
    print("'/mo' not found in bundle")

# Search for any occurrence of "Plan Management"
idx = content.find('Plan Management')
if idx >= 0:
    print("=== Plan Management context ===")
    print(repr(content[max(0, idx-100):idx+100]))
    print()
else:
    print("'Plan Management' not found in bundle")
