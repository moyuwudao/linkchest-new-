# -*- coding: utf-8 -*-
import re

ENV_PATH = "/opt/linkchest/api/project/apps/api/.env"
CHINA_PATH = "/opt/linkchest/api/project/apps/api/.env.china"

SANDBOX_APP_ID = "9021000164646437"
SANDBOX_PID = "2088721102032150"

for path in [ENV_PATH, CHINA_PATH]:
    with open(path) as f:
        content = f.read()

    if re.search(r"^ALIPAY_SANDBOX=", content, flags=re.MULTILINE):
        content = re.sub(r"^ALIPAY_SANDBOX=.*$", "ALIPAY_SANDBOX=true", content, flags=re.MULTILINE)
    else:
        content += "\n# alipay sandbox mode\nALIPAY_SANDBOX=true\n"

    if re.search(r"^ALIPAY_SANDBOX_APP_ID=", content, flags=re.MULTILINE):
        content = re.sub(r"^ALIPAY_SANDBOX_APP_ID=.*$", "ALIPAY_SANDBOX_APP_ID=" + SANDBOX_APP_ID, content, flags=re.MULTILINE)
    else:
        content += "ALIPAY_SANDBOX_APP_ID=" + SANDBOX_APP_ID + "\n"

    if not re.search(r"^ALIPAY_SANDBOX_PID=", content, flags=re.MULTILINE):
        content += "ALIPAY_SANDBOX_PID=" + SANDBOX_PID + "\n"

    if re.search(r"^ALIPAY_SANDBOX_PUBLIC_KEY=", content, flags=re.MULTILINE):
        content = re.sub(r"^ALIPAY_SANDBOX_PUBLIC_KEY=.*$", "ALIPAY_SANDBOX_PUBLIC_KEY=your_sandbox_alipay_public_key", content, flags=re.MULTILINE)
    else:
        content += "ALIPAY_SANDBOX_PUBLIC_KEY=your_sandbox_alipay_public_key\n"

    with open(path, "w") as f:
        f.write(content)

print("sandbox config written")
for path in [CHINA_PATH, ENV_PATH]:
    print("--- " + path + " ---")
    for line in open(path).read().split("\n"):
        if "ALIPAY_SANDBOX" in line or "ALIPAY_APP_ID=" in line or "ALIPAY_PUBLIC_KEY=" in line or "ALIPAY_PRIVATE_KEY=" in line:
            if "PRIVATE_KEY" in line:
                print(line.split("=")[0] + '="[REDACTED]"')
            else:
                print(line)
