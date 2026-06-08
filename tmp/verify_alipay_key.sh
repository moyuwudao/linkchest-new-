#!/usr/bin/env bash
# 验证 .env 中的 ALIPAY_PRIVATE_KEY 能否被正确解析为 PEM 格式

# 1. 读取 .env 中 ALIPAY_PRIVATE_KEY
PRIV_LINE=$(grep '^ALIPAY_PRIVATE_KEY=' /opt/linkchest/api/project/apps/api/.env)
PRIV_VAL=$(echo "$PRIV_LINE" | sed 's/^ALIPAY_PRIVATE_KEY=//' | sed 's/^"//' | sed 's/"$//')

# 2. 还原 \n 为真换行符
PRIV_PEM=$(printf '%b' "$PRIV_VAL")

# 3. 写入临时文件
echo "$PRIV_PEM" > /tmp/test_alipay_priv.pem
chmod 600 /tmp/test_alipay_priv.pem

# 4. 验证 PEM 格式
echo "=== PEM file content (前 100 字符) ==="
head -c 100 /tmp/test_alipay_priv.pem
echo
echo "=== openssl 解析 ==="
openssl rsa -in /tmp/test_alipay_priv.pem -check -noout 2>&1 | head -5
echo
echo "=== 公钥指纹 ==="
openssl rsa -in /tmp/test_alipay_priv.pem -pubout 2>/dev/null | openssl pkey -pubin -pubout -outform DER 2>/dev/null | sha256sum

# 5. 清理
rm -f /tmp/test_alipay_priv.pem
