#!/bin/bash
# ============================================================
# LinkChest 国内数据库服务器初始化脚本
# 适用于: Ubuntu 22.04 LTS
# 用途: 首次在数据库服务器上运行，安装 Docker 和 PostgreSQL
# 配置: 服务器B (2核4G6M) - 数据层
# 使用: chmod +x setup-postgres-cn.sh && sudo ./setup-postgres-cn.sh
# 更新时间: 2026-05-18
# ============================================================

set -e

echo "=========================================="
echo "  LinkChest 国内数据库服务器初始化 (服务器B)"
echo "  配置: 2核4G6M - 数据层"
echo "=========================================="

# 1. 更新系统
echo ""
echo "[1/6] 更新系统包..."
apt update && apt upgrade -y

# 2. 安装必要依赖
echo ""
echo "[2/6] 安装必要依赖..."
apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. 安装 Docker 和 Docker Compose
echo ""
echo "[3/6] 安装 Docker..."
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
echo "[4/6] 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi
echo "Docker Compose 版本: $(docker-compose --version)"

# 4. 配置防火墙（只允许内网访问数据库）
echo ""
echo "[5/6] 配置防火墙..."
ufw allow 22/tcp        # SSH
# 允许服务器A的内网IP访问数据库
# 将 SERVER_A_INTERNAL_IP 替换为实际的服务器A内网IP
# ufw allow from SERVER_A_INTERNAL_IP to any port 5432
ufw --force enable
echo "防火墙状态:"
ufw status

# 5. 创建应用目录
echo ""
echo "[6/6] 创建应用目录..."
mkdir -p /opt/linkchest/db
mkdir -p /opt/linkchest/backups
echo "应用目录已创建: /opt/linkchest/"

echo ""
echo "=========================================="
echo "  服务器B初始化完成！"
echo "=========================================="
echo ""
echo "配置摘要:"
echo "  • CPU: 2核"
echo "  • 内存: 4G"
echo "  • 带宽: 6M"
echo "  • 用途: PostgreSQL 16"
echo ""
echo "下一步:"
echo "  1. 配置防火墙允许服务器A访问:"
echo "     sudo ufw allow from SERVER_A_INTERNAL_IP to any port 5432"
echo "  2. 复制 docker-compose.cn.yml 到服务器:"
echo "     scp docker-compose.cn.yml ubuntu@SERVER_B_IP:/opt/linkchest/"
echo "  3. 创建 .env 文件配置数据库密码"
echo "  4. 启动数据库: cd /opt/linkchest && docker-compose up -d"
echo ""