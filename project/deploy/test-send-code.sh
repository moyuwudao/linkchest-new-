#!/bin/bash
# 测试发送验证码

echo "=== 测试发送验证码 ==="
curl -s -X POST http://localhost:3001/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","type":"register"}'

echo ""
