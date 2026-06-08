# -*- coding: utf-8 -*-
import re

ENV_PATH = "/opt/linkchest/api/project/apps/api/.env"
CHINA_PATH = "/opt/linkchest/api/project/apps/api/.env.china"

# 沙箱支付宝公钥（PEM 格式）
SANDBOX_ALIPAY_PUBLIC_KEY_PEM = (
    "-----BEGIN PUBLIC KEY-----\n"
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApH+rvvF3AEMKGbbdkX/m\n"
    "p80ru8jOCHW3jyc1PlxkaKT6RxlHeJJTGzNMc0g4UZzuGLJ/axxYPzDuQK4FNtIY\n"
    "15hmpIaZN/dNWx8iqbNJ+T2NyNxMk4rjTujwd234HVtBxGaCaS1YhUcr+LcoJdm5\n"
    "Ul3MGQsLKcWFCgOBNidXp9FGy+KAV1cPVL8diwQhPARKndO/JcpL/R0v3edWDJqY\n"
    "qSJgg152pHRJHyY8wjItrkqDlKIpBClSbYLVv1ILG9jTxURyo44F6yrf1dbBRwiU\n"
    "qZP/UPsOf+/04aEOMme1Ss4IxaWiFl8Ef565wf1ltkwMeDQBWU3G8WZe6pGh4OHt2\n"
    "QIDAQAB\n"
    "-----END PUBLIC KEY-----\n"
).strip()

# 转义换行符为 \n 字面量（单行存储）
SANDBOX_ALIPAY_PUBLIC_KEY_ESCAPED = SANDBOX_ALIPAY_PUBLIC_KEY_PEM.replace("\n", "\\n")

for path in [ENV_PATH, CHINA_PATH]:
    with open(path) as f:
        content = f.read()

    new_value = 'ALIPAY_SANDBOX_PUBLIC_KEY="' + SANDBOX_ALIPAY_PUBLIC_KEY_ESCAPED + '"'

    # 先删除任何已存在的多行 ALIPAY_SANDBOX_PUBLIC_KEY 配置（包括占位符、错的、写的多行）
    lines = content.split("\n")
    new_lines = []
    in_block = False
    for line in lines:
        if line.startswith("ALIPAY_SANDBOX_PUBLIC_KEY="):
            # 替换这一行（不保留原内容）
            in_block = True
            new_lines.append(new_value)
            # 如果这行后还有续行（多行形式），丢弃
            continue
        if in_block:
            # 如果是续行（有 base64 特征：纯字母数字+/=），丢弃
            if re.match(r"^[A-Za-z0-9+/=]+$", line.strip()) and len(line.strip()) > 30:
                continue
            else:
                in_block = False
        new_lines.append(line)

    content = "\n".join(new_lines)

    # 如果新文件中没有 ALIPAY_SANDBOX_PUBLIC_KEY=xxx 形式，追加
    if not any(l.startswith("ALIPAY_SANDBOX_PUBLIC_KEY=") for l in content.split("\n")):
        content += "\n" + new_value + "\n"

    with open(path, "w") as f:
        f.write(content)

    # 验证：单行存储？
    with open(path) as f:
        lines = f.readlines()
    matches = [l for l in lines if l.startswith("ALIPAY_SANDBOX_PUBLIC_KEY=")]
    if len(matches) == 1:
        line = matches[0].rstrip()
        if line.count("\n") == 0:  # 单行
            print("OK [" + path + "] " + str(len(line)) + " chars (single line)")
            # 验证 escape 后解码等于原公钥
            val = line.split('"', 2)[1]
            decoded = val.replace("\\n", "\n")
            if decoded == SANDBOX_ALIPAY_PUBLIC_KEY_PEM:
                print("  decoded matches original PEM: True")
        else:
            print("FAIL [" + path + "] still multiline!")
    else:
        print("FAIL [" + path + "] " + str(len(matches)) + " matches found")
