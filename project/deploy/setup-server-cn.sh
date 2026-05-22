#!/bin/bash
# ============================================================
# LinkChest 国内服务器初始化脚本
# 适用于: Ubuntu 22.04 LTS
# 用途: 首次在国内服务器上运行，安装 Node.js、pm2、Docker、Nginx 等
# 配置: 服务器A (4核8G5M) - 应用层
# 使用: chmod +x setup-server-cn.sh && sudo ./setup-server-cn.sh
# 更新时间: 2026-05-18
# ============================================================

set -e

echo "=========================================="
echo "  LinkChest 国内服务器初始化 (服务器A)"
echo "  配置: 4核8G5M - 应用层"
echo "=========================================="

# 1. 更新系统
echo ""
echo "[1/9] 更新系统包..."
apt update && apt upgrade -y

# 2. 安装必要依赖
echo ""
echo "[2/9] 安装必要依赖..."
apt install -y apt-transport-https ca-certificates curl software-properties-common nginx certbot python3-certbot-nginx git

# 3. 安装 Node.js 20.x (LTS)
echo ""
echo "[3/9] 安装 Node.js 20.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 4. 安装 pm2 进程管理器
echo ""
echo "[4/9] 安装 pm2..."
npm install -g pm2
pm2 startup
echo "pm2 版本: $(pm2 -v)"

# 5. 安装 Docker 和 Docker Compose
echo ""
echo "[5/9] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    # 配置国内镜像加速
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
EOF
    systemctl restart docker
fi
echo "Docker 版本: $(docker --version)"

# 安装 Docker Compose
echo ""
echo "[6/9] 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi
echo "Docker Compose 版本: $(docker-compose --version)"

# 6. 配置防火墙
echo ""
echo "[7/9] 配置防火墙..."
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP
ufw allow 443/tcp       # HTTPS
ufw allow 3000/tcp      # API
ufw allow 3001/tcp      # WEB
ufw --force enable
echo "防火墙状态:"
ufw status

# 7. 创建应用目录
echo ""
echo "[8/9] 创建应用目录..."
mkdir -p /opt/linkchest/api
mkdir -p /opt/linkchest/web
mkdir -p /opt/linkchest/backups
mkdir -p /opt/linkchest/logs
echo "应用目录已创建: /opt/linkchest/"

# 8. 配置 pm2 日志轮转
echo ""
echo "[9/9] 配置 pm2 日志轮转..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

echo ""
echo "=========================================="
echo "  服务器A初始化完成！"
echo "=========================================="
echo ""
echo "配置摘要:"
echo "  • CPU: 4核"
echo "  • 内存: 8G"
echo "  • 带宽: 5M"
echo "  • 用途: API + WEB + Redis + Nginx"
echo ""
echo "下一步:"
echo "  1. 配置域名: bash deploy/setup-domain.sh"
echo "  2. 部署代码: bash deploy/deploy.sh"
echo "  3. 在服务器B上运行 setup-postgres-cn.sh"
echo ""