#!/bin/bash
# 修复Docker国内镜像配置

sudo rm -f /etc/docker/daemon.json
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json > /dev/null << 'JSONEOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com", "https://docker.mirrors.ustc.edu.cn"]
}
JSONEOF

echo "配置文件内容:"
cat /etc/docker/daemon.json

echo ""
echo "重启Docker..."
sudo systemctl daemon-reload
sudo systemctl restart docker
sleep 3

echo ""
echo "Docker状态:"
sudo systemctl status docker --no-pager | head -5

echo ""
echo "镜像配置:"
sudo docker info 2>/dev/null | grep -A 3 "Registry Mirrors" || echo "无法获取docker info"
