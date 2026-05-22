#!/bin/bash
# 测试登录

echo "=== 测试登录 ==="
curl -s -X POST http://localhost:3001/api/auth/login-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"password"}'

echo ""
