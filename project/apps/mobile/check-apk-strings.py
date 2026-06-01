import re

BUNDLE = "/tmp/apk-contents/assets/index.android.bundle"

with open(BUNDLE, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

searches = [
    "tier.pro",
    "Pro",
    "Ultimate",
    "Plan Management",
    "/mo",
    "Not Subscribed",
    "微信登录",
    "应用宝",
    "linkchest.cn",
    "linkchest.net",
]

print("=== APK Bundle Strings ===")
for s in searches:
    count = content.count(s)
    status = "FOUND" if count > 0 else "NOT FOUND"
    print(f"{s}: {status} (count: {count})")
