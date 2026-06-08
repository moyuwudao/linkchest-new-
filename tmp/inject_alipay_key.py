#!/usr/bin/env python3
"""把支付宝私钥注入到 .env.china 中 (单行 \\n 转义格式)"""
import re

ENV_PATH = "/opt/linkchest/api/project/apps/api/.env.china"
KEY_PATH = "/opt/linkchest/api/secrets/alipay_app_private_key_pkcs8.pem"

# 1. 读取私钥
with open(KEY_PATH) as f:
    privkey = f.read().strip()

# 2. 把真实换行符替换为字面 \n（两个字符），变成单行
privkey_escaped = privkey.replace("\n", "\\n")

# 3. 读取 .env
with open(ENV_PATH) as f:
    lines = f.readlines()

# 4. 逐行替换（避免正则的多行问题）
new_lines = []
for line in lines:
    if line.startswith("ALIPAY_APPID="):
        new_lines.append("ALIPAY_APP_ID=your_alipay_appid_here\n")
    elif line.startswith("ALIPAY_PRIVATE_KEY="):
        new_lines.append('ALIPAY_PRIVATE_KEY="' + privkey_escaped + '"\n')
    elif line.startswith("ALIPAY_PUBLIC_KEY="):
        new_lines.append("ALIPAY_PUBLIC_KEY=your_alipay_public_key_here\n")
    else:
        new_lines.append(line)

# 5. 写回
with open(ENV_PATH, "w") as f:
    f.writelines(new_lines)

# 6. 验证：显示前 3 行 + ALIPAY_PRIVATE_KEY 是否单行
result_lines = open(ENV_PATH).readlines()
print("File total lines:", len(result_lines))
for i, line in enumerate(result_lines):
    if "ALIPAY_" in line and "ALIPAY_APP_ID" in line or "ALIPAY_PUBLIC_KEY" in line or "ALIPAY_NOTIFY" in line or "ALIPAY_LOGIN" in line:
        print(f"L{i+1}: {line.rstrip()}")
    if "ALIPAY_PRIVATE_KEY" in line:
        # 验证单行
        print(f"L{i+1}: ALIPAY_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n[2048-bit PKCS8, REDACTED]\\n-----END PRIVATE KEY-----\"")
        # 也打印实际行内容长度
        print(f"     (line length: {len(line.rstrip())} chars)")

# 7. 验证 \n 转义正确
priv_line = next(l for l in result_lines if l.startswith("ALIPAY_PRIVATE_KEY="))
unescaped = priv_line.split('"')[1].replace("\\n", "\n")
print()
print("Decoded private key matches original:", unescaped == privkey)
print("Original key length:", len(privkey))
print("Escaped key length:", len(privkey_escaped))
