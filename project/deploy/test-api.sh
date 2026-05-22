#!/bin/bash
# 测试API接口

echo "=== 测试注册 ==="
curl -s -X POST http://localhost:3001/api/auth/register-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"Test123456","code":"123456"}'

echo ""
echo ""
echo "=== 测试登录 ==="
curl -s -X POST http://localhost:3001/api/auth/login-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"Test123456"}'

echo ""
echo ""
echo "=== 测试健康检查 ==="
curl -s http://localhost:3001/health

echo ""
