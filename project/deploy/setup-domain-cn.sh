#!/bin/bash
# ============================================================
# LinkChest 域名绑定 + SSL 证书配置脚本 (国内版)
# 域名: linkchest.cn
# 服务器: 43.136.82.88 (应用层)
# 使用: chmod +x setup-domain-cn.sh && sudo ./setup-domain-cn.sh
# 前置条件: 域名 DNS 已指向服务器 IP
# 更新时间: 2026-05-18
# ============================================================

set -e

DOMAIN="linkchest.cn"
SERVER_IP="${SERVER_IP:-43.136.82.88}"
NGINX_CONF="/etc/nginx/sites-available/linkchest-cn"
NGINX_TEMP_CONF="/etc/nginx/sites-available/linkchest-cn-temp"

echo "=========================================="
echo "  LinkChest 域名绑定 & SSL 配置 (国内版)"
echo "  域名: $DOMAIN"
echo "  服务器: $SERVER_IP"
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 安装 Nginx
echo ""
echo "[1/8] 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
    systemctl enable nginx
fi
nginx -v

# 2. 安装 Certbot
echo ""
echo "[2/8] 安装 Certbot (Let's Encrypt)..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi
certbot --version

# 3. 创建 Certbot 验证目录
echo ""
echo "[3/8] 创建证书验证目录..."
mkdir -p /var/www/certbot

# 4. 先配置临时 HTTP 站点
echo ""
echo "[4/8] 配置临时 HTTP 站点..."

if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

cat > "$NGINX_TEMP_CONF" << 'EOF'
server {
    listen 80;
    server_name linkchest.cn www.linkchest.cn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "LinkChest - Domain verification in progress...";
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf "$NGINX_TEMP_CONF" /etc/nginx/sites-enabled/linkchest-cn
nginx -t
systemctl restart nginx
echo "✅ Nginx HTTP 模式已启动"

# 5. 申请 SSL 证书
echo ""
echo "[5/8] 申请 Let's Encrypt SSL 证书..."
echo "⚠️  确保域名 $DOMAIN 的 DNS A 记录已指向 $SERVER_IP"
echo "    检测中..."

RESOLVED_IP=$(dig +short $DOMAIN 2>/dev/null || echo "")
if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo "⚠️  警告: 域名 $DOMAIN 解析结果 ($RESOLVED_IP) 与服务器 IP ($SERVER_IP) 不一致"
    echo "    DNS 可能需要几分钟到几小时生效，是否继续? (y/n)"
    read -r confirm
    if [ "$confirm" != "y" ]; then
        echo "已取消。请等待 DNS 生效后再运行此脚本。"
        exit 0
    fi
fi

certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN

echo "✅ SSL 证书申请成功"

# 6. 配置完整 HTTPS 反向代理
echo ""
echo "[6/8] 配置完整 HTTPS 反向代理..."

cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name linkchest.cn www.linkchest.cn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name linkchest.cn www.linkchest.cn;

    ssl_certificate /etc/letsencrypt/live/linkchest.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/linkchest.cn/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
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
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/linkchest-cn
rm -f "$NGINX_TEMP_CONF"

nginx -t
echo "✅ Nginx HTTPS 配置测试通过"

# 7. 配置自动续期
echo ""
echo "[7/8] 配置 SSL 自动续期..."

CRON_JOB="0 2 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ 已添加 SSL 自动续期任务"
else
    echo "✅ SSL 自动续期任务已存在"
fi

# 8. 重启 Nginx
echo ""
echo "[8/8] 重启 Nginx..."
systemctl restart nginx
systemctl status nginx --no-pager

echo ""
echo "=========================================="
echo "  域名绑定完成!"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  🌐 Web 前端:     https://$DOMAIN"
echo "  🔌 API 接口:     https://$DOMAIN/api"
echo "  📤 分享页面:     https://$DOMAIN/s/:shareId"
echo "  💓 健康检查:     https://$DOMAIN/health"
echo ""
echo "SSL 证书:"
echo "  路径: /etc/letsencrypt/live/$DOMAIN/"
echo "  自动续期: 已配置 (每天凌晨2点检查)"
echo ""
echo "⚠️  下一步: 更新 .env 中的 SHARE_BASE_URL 和 CORS_ORIGIN，然后重启 API 服务"
echo "   pm2 restart linkchest-api"
echo ""
