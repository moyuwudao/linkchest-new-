#!/bin/bash
echo "=== 支付宝支付流程测试 ==="
# 1. 登录获取 token
echo "1. 登录..."
LOGIN_RESP=$(curl -s -X POST https://linkchest.cn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test_admin@linkchest.cn","password":"admin123456"}' 2>&1)
echo "登录响应: $(echo $LOGIN_RESP | head -c 200)"
TOKEN=$(echo $LOGIN_RESP | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "未拿到 token,尝试 admin 用户"
  LOGIN_RESP=$(curl -s -X POST https://linkchest.cn/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@linkchest.cn","password":"admin123456"}')
  echo "登录响应: $(echo $LOGIN_RESP | head -c 200)"
  TOKEN=$(echo $LOGIN_RESP | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null)
fi
echo "Token: ${TOKEN:0:30}..."

if [ -n "$TOKEN" ]; then
  echo ""
  echo "2. 创建支付宝订单 (billingCycle=yearly)..."
  ORDER_RESP=$(curl -s -X POST https://linkchest.cn/api/payments/alipay/create-order \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"tier":"heavy","billingCycle":"yearly"}')
  echo "订单响应: $(echo $ORDER_RESP | head -c 500)"
fi
