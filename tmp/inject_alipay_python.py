#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 支付宝沙箱配置 - 在服务器端直接写入 .env（v2 - 重新生成的密钥对）

ENV_FILE = '/opt/linkchest/api/project/apps/api/.env'

# 私钥（PEM 格式，单行存储，\n 是字面 2 字符）
PRIV_KEY = (
    "-----BEGIN PRIVATE KEY-----\n"
    "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDOv0ZgC+CVsTtX\n"
    "A6xOWb22angbW/1wVbBm8LrxtY4YPwIuhCYZsViRb/EIcDA0/rhnQhrXUbphbUJ/\n"
    "qcMXdo2Xf0vDDRxxnRzzm04FmkgDbah3Mw3cfOAN4vCeFGmk9YwH57WVT5sUXsSc\n"
    "JE6CUsH6zSc1O108nyY58Fi9vtfmhux4EOoHFyJfsGYRqJXgc+wOQyCPG1SBs7d0\n"
    "2DrK4iM46y5Tz6+PTonsApwp4koulL58EN8PNbIu1Zu+qpbTt7YMP1Pezx74qoWG\n"
    "lk0swA3ISEH0oLxTMrU+4sIuXMDjFtHx+0/5jOdnftRCU5pOaGu9MHatNMCH/E5K\n"
    "zxW+Ueg5AgMBAAECggEAA7aJtAXila2mLCzjtlCESLdmys7/ITpYvbCLGvYwxBy1\n"
    "lFJJQOLffVUuVgF1zC3a7/fO9ZkBKOjGbfaFi3FUn6jommss3Jl+wJ1EbHNV4cHh\n"
    "aaqgEBqqB3XQ7nXdY9oJFsdBipnwZhBBpbA9PLfxxehTUPBs/z64eAfqABZiWECB\n"
    "yfIS/hIXvNSc/OBLFDrF3j8g/bhO1xpaOqw4Jkctiv3YeAIPnG/n0FftHLe3lF0r\n"
    "vVGU7VP+yYoZC/YFeFH4NUbbLDad5YjdujfYxRWpTsjXetflgYFnxLbaUMQMQDxK\n"
    "yF4qAbgdqFsRiTt6SHchy5D1WjLMiAmI9tMT1cAhhQKBgQD59WjldfJmWqNVcDJ6\n"
    "MV2ssfo4kM7vBkgSBjVMmtB5wQBG8Y1CJG4FSdjSno9vexLWRtUDGjwVlIWDbTQb\n"
    "qUWt9RDupnYHgIvBpHcVHVrZTVuWm5/2nWswo7S2DsCdLazxcNliYUv5djP+eVLQ\n"
    "ni+WMZBnaC/BkbvpJCsT776m0wKBgQDTvn/LHWnxG2CgE18QCueuSEZ2Rcqkr5Q/\n"
    "M2DZMwr1Vv2CRvTcq5SOJj5Z01qepyoDgbmFoNGQ9Xij8Rg1fac0aEupEM70M3Ds\n"
    "ibDysR+E2+Xeh3dz14Lx+9VMzfe0STJo88SJyWHoZwVCCSnInP3VnG0ujkjqVbh0\n"
    "u57cbxllQwKBgQCR4sPIOOCzEG+H7CXp32oW4wFxhkLgisABlRICldDbXuO0hEK3\n"
    "ud9kwscDlnuMyz4hRdIJL4Sl67tJC7F/+3mpoACz6P+2PTZUXJMMBcgCT/4Glunz\n"
    "28i16LYOE+ojUoc/m2ek3bij7nNGMLU/ATQw6tinIc3NoisUVYG27xRM9QKBgQCS\n"
    "ibTRMaL+3G6LebyBUrqxr40sDvLF9EkJUBpHVn7P+YrqHQcarJfbpHXkHlQJljCK\n"
    "Sr3Ez94YjvkVpCWX50TPDRrHfz1qXStaV5Qg8RmaDcDQtzmg7tXNd/ZO9//kQf/k\n"
    "CEfM/5SFjL5jzAmhr5wvt9kLriaiHf7QsoOnlC+kFwKBgQDF4D+rbnqs51/ulQ35\n"
    "Q6UZg/FGlhvUVqbn2IK45O04V++1qCRBZ7gZ4suTvNqrNinMUVA4CHq3yKl9WWDW\n"
    "T1HLQEZBoDRQR+3Ix4QCNg1blQdgaNMJi6QJCqgTIf/pok8HQdVnOvWaWqrq64/S\n"
    "J+2+HfrCbFCTg0gwW3W+7HZPOg==\n"
    "-----END PRIVATE KEY-----\n"
)

# 公钥（PEM 格式，单行存储，\n 是字面 2 字符）
PUB_KEY = (
    "-----BEGIN PUBLIC KEY-----\n"
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzr9GYAvglbE7VwOsTlm9\n"
    "tmp4G1v9cFWwZvC68bWOGD8CLoQmGbFYkW/xCHAwNP64Z0Ia11G6YW1Cf6nDF3aN\n"
    "l39Lww0ccZ0c85tOBZpIA22odzMN3HzgDeLwnhRppPWMB+e1lU+bFF7EnCROglLB\n"
    "+s0nNTtdPJ8mOfBYvb7X5obseBDqBxciX7BmEaiV4HPsDkMgjxtUgbO3dNg6yuIj\n"
    "OOsuU8+vj06J7AKcKeJKLpS+fBDfDzWyLtWbvqqW07e2DD9T3s8e+KqFhpZNLMAN\n"
    "yEhB9KC8UzK1PuLCLlzA4xbR8ftP+YznZ37UQlOaTmhrvTB2rTTAh/xOSs8VvlHo\n"
    "OQIDAQAB\n"
    "-----END PUBLIC KEY-----\n"
)


def verify_b64_lines(pem: str, label: str):
    """验证 PEM 内部的 base64 行长度（中间行必须 64 字符，最后一行可短）"""
    lines = pem.strip().split('\n')
    body = lines[1:-1]  # 去掉 BEGIN/END 标记行
    # 中间行（不含最后一行）必须 64 字符
    mid = body[:-1]
    bad = [(i + 2, len(line)) for i, line in enumerate(mid) if len(line) != 64]
    if bad:
        raise ValueError(f"{label} 中间 base64 行长度错误: {bad}")
    last = body[-1]
    print(f"{label} base64 行验证通过: {len(mid)} 行 x 64 字符 + 末行 {len(last)} 字符")


# 校验私钥公钥完整性
verify_b64_lines(PRIV_KEY, "PRIV_KEY")
verify_b64_lines(PUB_KEY, "PUB_KEY")

# 拼接配置（保留 \n 转义）
config_block = (
    "\n"
    "# === Alipay Sandbox (added 2026-06-05, regenerated) ===\n"
    "ALIPAY_SANDBOX=true\n"
    "ALIPAY_SANDBOX_APP_ID=9021000164646437\n"
    f'ALIPAY_SANDBOX_PRIVATE_KEY="{PRIV_KEY}"\n'
    f'ALIPAY_SANDBOX_PUBLIC_KEY="{PUB_KEY}"\n'
)

# 追加到 .env 文件
with open(ENV_FILE, 'a', encoding='utf-8') as f:
    f.write(config_block)

print(f"OK appended {len(config_block)} bytes to {ENV_FILE}")
print(f"PRIV_KEY length: {len(PRIV_KEY)}")
print(f"PUB_KEY length: {len(PUB_KEY)}")
