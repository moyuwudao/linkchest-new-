#!/usr/bin/env python3
"""修复国内版 .env 中的域名配置（linkchest.cn）+ 支付宝 notify URL"""
import re

ENV_PATH = "/opt/linkchest/api/project/apps/api/.env"
CHINA_PATH = "/opt/linkchest/api/project/apps/api/.env.china"

# 国内正式域名
CN_BASE = "https://linkchest.cn"
CN_NOTIFY = f"{CN_BASE}/api/payments/alipay/notify"
CN_WECHAT_NOTIFY = f"{CN_BASE}/api/payments/wechat/notify"

# 1. 修复 .env.china：域名 + notify URL
with open(CHINA_PATH) as f:
    china_content = f.read()

china_content = re.sub(
    r"^ALIPAY_NOTIFY_URL=.*$",
    f"ALIPAY_NOTIFY_URL={CN_NOTIFY}",
    china_content,
    flags=re.MULTILINE,
)
china_content = re.sub(
    r"^WECHAT_PAY_NOTIFY_URL=.*$",
    f"WECHAT_PAY_NOTIFY_URL={CN_WECHAT_NOTIFY}",
    china_content,
    flags=re.MULTILINE,
)
china_content = re.sub(
    r"^FRONTEND_URL=.*$",
    f"FRONTEND_URL={CN_BASE}",
    china_content,
    flags=re.MULTILINE,
)

# 添加或更新 WEB_BASE_URL
if re.search(r"^WEB_BASE_URL=", china_content, flags=re.MULTILINE):
    china_content = re.sub(
        r"^WEB_BASE_URL=.*$",
        f"WEB_BASE_URL={CN_BASE}",
        china_content,
        flags=re.MULTILINE,
    )
else:
    china_content += f"\n# 国内正式域名（前后端共用）\nWEB_BASE_URL={CN_BASE}\n"

with open(CHINA_PATH, "w") as f:
    f.write(china_content)

# 2. 同步到 .env（start-api.sh 实际加载的文件）
with open(ENV_PATH) as f:
    env_content = f.read()

env_content = re.sub(
    r"^ALIPAY_NOTIFY_URL=.*$",
    f"ALIPAY_NOTIFY_URL={CN_NOTIFY}",
    env_content,
    flags=re.MULTILINE,
)
env_content = re.sub(
    r"^WECHAT_PAY_NOTIFY_URL=.*$",
    f"WECHAT_PAY_NOTIFY_URL={CN_WECHAT_NOTIFY}",
    env_content,
    flags=re.MULTILINE,
)
env_content = re.sub(
    r"^FRONTEND_URL=.*$",
    f"FRONTEND_URL={CN_BASE}",
    env_content,
    flags=re.MULTILINE,
)

if re.search(r"^WEB_BASE_URL=", env_content, flags=re.MULTILINE):
    env_content = re.sub(
        r"^WEB_BASE_URL=.*$",
        f"WEB_BASE_URL={CN_BASE}",
        env_content,
        flags=re.MULTILINE,
    )
else:
    env_content += f"\n# 国内正式域名（前后端共用）\nWEB_BASE_URL={CN_BASE}\n"

with open(ENV_PATH, "w") as f:
    f.write(env_content)

# 3. 验证
print("=== .env.china ===")
for line in open(CHINA_PATH).read().split("\n"):
    if any(k in line for k in ["WEB_BASE_URL", "FRONTEND_URL", "NOTIFY_URL", "ALIPAY_"]):
        if "PRIVATE_KEY" in line:
            print(line.split("=")[0] + '="[REDACTED]"')
        else:
            print(line)
print()
print("=== .env ===")
for line in open(ENV_PATH).read().split("\n"):
    if any(k in line for k in ["WEB_BASE_URL", "FRONTEND_URL", "NOTIFY_URL", "ALIPAY_"]):
        if "PRIVATE_KEY" in line:
            print(line.split("=")[0] + '="[REDACTED]"')
        else:
            print(line)
