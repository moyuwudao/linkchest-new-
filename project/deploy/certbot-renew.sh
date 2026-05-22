#!/bin/bash
# ============================================================
# LinkChest SSL 证书自动续期脚本 (Let's Encrypt / Certbot)
# 建议通过 crontab 每日执行：0 3 * * * /opt/linkchest/deploy/certbot-renew.sh >> /var/log/linkchest-certbot.log 2>&1
# 权限设置：chmod +x deploy/certbot-renew.sh
# ============================================================

set -e

DOMAIN="linkchest.net"
WEBROOT="/opt/linkchest/web/apps/web/dist"
NGINX_CONTAINER="linkchest-nginx"
DEPLOY_HOOK="docker exec $NGINX_CONTAINER nginx -s reload"

echo "[$(date)] 开始检查 SSL 证书续期..."

# 使用 webroot 模式续期（适合已有 Nginx 提供 80 端口服务的环境）
# 如果是独立模式，去掉 --webroot 和 -w 参数
if certbot renew --webroot -w "$WEBROOT" --quiet --deploy-hook "$DEPLOY_HOOK"; then
    echo "[$(date)] SSL 证书续期检查完成"
else
    echo "[$(date)] SSL 证书续期失败，请检查 certbot 日志"
    exit 1
fi
