import re

BUNDLE = "/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

# Search for translated values
searches = [
    "Not Subscribed",
    "Plan Management",
    "/mo",
    "/yr",
    "Pro",
    "Ultimate",
    "Collections",
    "My Collections",
]

for s in searches:
    idx = content.find(s)
    if idx >= 0:
        # Count occurrences
        count = content.count(s)
        print(f"'{s}': FOUND (count: {count})")
    else:
        print(f"'{s}': NOT FOUND")

# Check if "Pro" appears near "super" or "tier"
idx = content.find('super')
if idx >= 0:
    print(f"\n=== Context around 'super' ===")
    print(repr(content[max(0, idx-50):idx+50]))

idx = content.find('notSubscribed')
if idx >= 0:
    print(f"\n=== Context around 'notSubscribed' ===")
    print(repr(content[max(0, idx-50):idx+50]))
