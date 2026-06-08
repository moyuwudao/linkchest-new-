#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 在国内 .env 追加 ALIPAY_SANDBOX_PRIVATE_KEY

ENV_FILE = '/opt/linkchest/api/project/apps/api/.env'

# 沙箱用户私钥（PKCS#8 格式，重新生成的那对）
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


def verify_b64_lines(pem: str, label: str):
    lines = pem.strip().split('\n')
    body = lines[1:-1]
    mid = body[:-1]
    bad = [(i + 2, len(line)) for i, line in enumerate(mid) if len(line) != 64]
    if bad:
        raise ValueError(f"{label} 中间 base64 行长度错误: {bad}")
    last = body[-1]
    print(f"{label} base64 行验证通过: {len(mid)} 行 x 64 字符 + 末行 {len(last)} 字符")


verify_b64_lines(PRIV_KEY, "PRIV_KEY")

# 追加到 .env 末尾
config_line = f'ALIPAY_SANDBOX_PRIVATE_KEY="{PRIV_KEY}"\n'

# 检查是否已存在
with open(ENV_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

if 'ALIPAY_SANDBOX_PRIVATE_KEY' in content:
    raise ValueError("ALIPAY_SANDBOX_PRIVATE_KEY 已存在，拒绝覆盖")

# 追加
with open(ENV_FILE, 'a', encoding='utf-8') as f:
    f.write(config_line)

print(f"OK appended {len(config_line)} bytes to {ENV_FILE}")
print(f"PRIV_KEY length: {len(PRIV_KEY)}")
