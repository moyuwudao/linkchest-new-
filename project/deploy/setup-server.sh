#!/bin/bash
# ============================================================
# LinkChest API 服务器初始化脚本
# 适用于: Ubuntu 24.04 LTS
# 用途: 首次在服务器上运行，安装 Node.js、pm2、防火墙等
# 使用: chmod +x setup-server.sh && sudo ./setup-server.sh
# ============================================================

set -e

echo "=========================================="
echo "  LinkChest API 服务器初始化"
echo "=========================================="

# 1. 更新系统
echo ""
echo "[1/7] 更新系统包..."
apt update && apt upgrade -y

# 2. 安装 Node.js 20.x (LTS)
echo ""
echo "[2/7] 安装 Node.js 20.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 3. 安装 pm2 进程管理器
echo ""
echo "[3/7] 安装 pm2..."
npm install -g pm2
pm2 startup
echo "pm2 版本: $(pm2 -v)"

# 4. 安装 Docker
echo ""
echo "[4/7] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi
echo "Docker 版本: $(docker --version)"

# 5. 配置防火墙
echo ""
echo "[5/7] 配置防火墙..."
# 允许 SSH
ufw allow 22/tcp
# 允许 API 端口
ufw allow 3001/tcp
# 允许 Web 端口
ufw allow 3003/tcp
# 启用防火墙（如果未启用）
ufw --force enable
echo "防火墙状态:"
ufw status

# 6. 创建应用目录
echo ""
echo "[6/7] 创建应用目录..."
mkdir -p /opt/linkchest/api
mkdir -p /opt/linkchest/backups
echo "应用目录已创建: /opt/linkchest/"

# 7. 配置 pm2 日志轮转
echo ""
echo "[7/7] 配置 pm2 日志轮转..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

echo ""
echo "=========================================="
echo "  服务器初始化完成！"
echo "=========================================="
echo ""
echo "下一步: 在本地运行 deploy.sh 将代码部署到服务器"
echo "  bash deploy/deploy.sh"
echo ""
