#!/bin/bash
# ============================================================
# LinkChest Nginx HTTP配置（备案期间使用）
# 域名: linkchest.cn
# 服务器: 43.136.82.88
# ============================================================

set -e

DOMAIN="linkchest.cn"
NGINX_CONF="/etc/nginx/sites-available/linkchest-cn"

echo "=========================================="
echo "  LinkChest Nginx HTTP配置"
echo "  域名: $DOMAIN"
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行"
    exit 1
fi

# 删除默认配置
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

# 创建HTTP配置
cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name linkchest.cn www.linkchest.cn;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            return 204;
        }
    }

    location /s/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/linkchest-cn

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl status nginx --no-pager | head -5

echo ""
echo "=========================================="
echo "  Nginx HTTP配置完成"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  API接口: http://$DOMAIN/api"
echo "  健康检查: http://$DOMAIN/health"
echo ""
echo "⚠️  备案通过后运行 setup-domain-cn.sh 配置HTTPS"
