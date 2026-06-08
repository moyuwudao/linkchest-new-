#!/usr/bin/env python3
"""删除 .env 中重复的 ALIPAY_APPID（保留 ALIPAY_APP_ID）"""
ENV_PATH = "/opt/linkchest/api/project/apps/api/.env"

with open(ENV_PATH) as f:
    lines = f.readlines()

new_lines = []
removed = []
for line in lines:
    # 删除 ALIPAY_APPID 行（旧变量名，代码已改用 ALIPAY_APP_ID）
    if line.startswith("ALIPAY_APPID="):
        removed.append(line.rstrip())
        continue
    new_lines.append(line)

with open(ENV_PATH, "w") as f:
    f.writelines(new_lines)

print(f"Removed {len(removed)} duplicate lines:")
for l in removed:
    print(f"  {l}")
