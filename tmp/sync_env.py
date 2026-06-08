#!/usr/bin/env python3
"""把 .env.china 同步到 .env（仅同步 .env.china 中存在但 .env 中是占位符的项）"""
import re

ENV_PATH = "/opt/linkchest/api/project/apps/api/.env"
CHINA_PATH = "/opt/linkchest/api/project/apps/api/.env.china"

with open(ENV_PATH) as f:
    env_lines = f.readlines()
with open(CHINA_PATH) as f:
    china_lines = f.readlines()

# 从 .env.china 提取 (key, value) 对
china_kv = {}
for line in china_lines:
    m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line)
    if m:
        china_kv[m.group(1)] = m.group(2)

# 把 .env.china 中的值同步到 .env 中
# 规则：只在 .env 的对应 key 是占位符（your_xxx）时才覆盖
new_env_lines = []
synced = []
for line in env_lines:
    m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line)
    if m:
        key = m.group(1)
        old_val = m.group(2)
        if key in china_kv:
            new_val = china_kv[key]
            is_placeholder = old_val.strip().startswith("your_") or old_val.strip() == ""
            if is_placeholder and new_val.strip() and not new_val.strip().startswith("your_"):
                # 用 .env.china 的值替换
                new_env_lines.append(f"{key}={new_val}\n")
                synced.append((key, "UPDATED"))
                continue
            else:
                synced.append((key, "KEPT"))
        else:
            synced.append((key, "ONLY_IN_ENV"))
    new_env_lines.append(line)

# 同时新增 .env.china 中有而 .env 中没的 key
existing_keys = set(re.match(r"^([A-Z_][A-Z0-9_]*)=", l).group(1) for l in env_lines if re.match(r"^([A-Z_][A-Z0-9_]*)=", l))
for key, val in china_kv.items():
    if key not in existing_keys:
        new_env_lines.append(f"\n# Added from .env.china\n{key}={val}\n")
        synced.append((key, "ADDED"))

with open(ENV_PATH, "w") as f:
    f.writelines(new_env_lines)

print("Synced keys:")
for k, status in synced:
    print(f"  {status:20s} {k}")
print()
print("Done. .env updated.")
