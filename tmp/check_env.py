#!/usr/bin/env python3
lines = open("/opt/linkchest/api/project/apps/api/.env.china").readlines()
start = next(i for i, l in enumerate(lines) if l.startswith("ALIPAY_PRIVATE_KEY"))
print("Lines", start + 1, "to", start + 30, "of", len(lines))
for i, l in enumerate(lines[start:start + 30]):
    if "PRIVATE KEY" in l and "REDACT" not in l:
        # 隐藏私钥内容
        if "BEGIN" in l:
            print(f"{start + i + 1}: {l.rstrip()}")
        else:
            print(f"{start + i + 1}: [BASE64 line REDACTED]")
    else:
        print(f"{start + i + 1}: {l.rstrip()}")
