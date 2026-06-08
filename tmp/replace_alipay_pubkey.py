#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 替换 .env 中的 ALIPAY_SANDBOX_PUBLIC_KEY 为沙箱支付宝公钥

ENV_FILE = '/opt/linkchest/api/project/apps/api/.env'

# 沙箱支付宝公钥（用户从支付宝沙箱平台获取，用于验签）
SANDBOX_ALIPAY_PUBLIC_KEY = (
    "-----BEGIN PUBLIC KEY-----\n"
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApH+rvvF3AEMKGbbdkX/m\n"
    "p80ru8jOCHW3jyc1PlxkaKT6RxlHeJJTGzNMc0g4UZzuGLJ/axxYPzDuQK4FNtIY\n"
    "15hmpIaZN/dNWx8iqbNJ+T2NyNxMk4rjTujwd234HVtBxGaCaS1YhUcr+LcoJdm5\n"
    "Ul3MGQsLKcWFCgOBNidXp9FGy+KAV1cPVL8diwQhPARKndO/JcpL/R0v3edWDJqY\n"
    "qSJgg152pHRJHyY8wjItrkqDlKIpBClSbYLVv1ILG9jTxURyo44F6yrf1dbBRwiU\n"
    "qZP/UPsOf+/04aEOMme1Ss4IxaWiFl8Ef565wf1ltkwMeDQBWU3G8WZe6pGh4OHt2\n"
    "QIDAQAB\n"
    "-----END PUBLIC KEY-----\n"
)

# 读取当前 .env
with open(ENV_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到 ALIPAY_SANDBOX_PUBLIC_KEY 起始行
start = None
for i, line in enumerate(lines):
    if line.startswith('ALIPAY_SANDBOX_PUBLIC_KEY='):
        start = i
        break

if start is None:
    raise ValueError("未找到 ALIPAY_SANDBOX_PUBLIC_KEY 行")

# 找到 PUBLIC_KEY 值的结束（下一个 ALIPAY_SANDBOX_ 配置或注释行）
end = start + 1
while end < len(lines):
    line = lines[end]
    # 结束条件：下一行是新的非 PUBLIC_KEY 续行的配置/注释/空行
    # PUBLIC_KEY 的值用引号包裹，包含多行，结束是带 " 的行
    if line.strip() == '"':
        end += 1
        break
    end += 1

# 替换为沙箱支付宝公钥
new_block = [f'ALIPAY_SANDBOX_PUBLIC_KEY="{SANDBOX_ALIPAY_PUBLIC_KEY}"\n']
new_lines = lines[:start] + new_block + lines[end:]

# 写回
with open(ENV_FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"OK replaced PUBLIC_KEY block: lines {start+1}..{end}")
print(f"Old block had {end - start} lines, new block has {len(new_block)} lines")
print(f"Sandbox alipay public key length: {len(SANDBOX_ALIPAY_PUBLIC_KEY)}")
