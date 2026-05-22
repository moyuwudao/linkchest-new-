#!/bin/bash
# 完整登录流程测试

SERVER_A_IP="43.136.82.88"

echo "=========================================="
echo "  完整登录流程测试"
echo "=========================================="

echo ""
echo "[1/4] 访问登录页 (通过Nginx 80端口)..."
LOGIN_PAGE=$(curl -s --connect-timeout 10 "http://$SERVER_A_IP/login" | head -c 500)
if echo "$LOGIN_PAGE" | grep -q "login\|登录\|Login"; then
    echo "✅ 登录页可访问"
else
    echo "⚠️ 登录页响应异常"
    echo "响应内容: $LOGIN_PAGE"
fi

echo ""
echo "[2/4] 测试API登录接口..."
LOGIN_RESPONSE=$(curl -s -X POST "http://$SERVER_A_IP/api/auth/login-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@linkchest.cn","password":"password"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ 登录接口正常，成功获取token"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token前20字符: ${TOKEN:0:20}..."
else
    echo "❌ 登录接口异常"
    echo "响应: $LOGIN_RESPONSE"
fi

echo ""
echo "[3/4] 测试获取用户信息 (带Token)..."
if [ -n "$TOKEN" ]; then
    USER_RESPONSE=$(curl -s "http://$SERVER_A_IP/api/user" \
      -H "Authorization: Bearer $TOKEN")
    if echo "$USER_RESPONSE" | grep -q "id\|email"; then
        echo "✅ 获取用户信息成功"
    else
        echo "⚠️ 获取用户信息失败: $USER_RESPONSE"
    fi
else
    echo "⏭️ 跳过（无token）"
fi

echo ""
echo "[4/4] 测试静态资源加载..."
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 \
  "http://$SERVER_A_IP/_next/static/css/3c68ef7f3ff36d18.css" 2>/dev/null || echo "000")
if [ "$CSS_STATUS" = "200" ]; then
    echo "✅ CSS静态资源可加载 (HTTP 200)"
else
    echo "⚠️ CSS静态资源返回 HTTP $CSS_STATUS"
fi

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  登录页: http://$SERVER_A_IP/login"
echo "  首页:   http://$SERVER_A_IP"
echo ""
echo "测试账户:"
echo "  邮箱: test@linkchest.cn"
echo "  密码: password"
