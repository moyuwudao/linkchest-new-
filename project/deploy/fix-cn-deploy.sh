#!/bin/bash
# 国内服务器部署修复脚本
cd /opt/linkchest/api/project

# 修复 git remote
sed -i 's|git remote set-url origin.*|# skip mirror|' deploy/update-server-cn.sh

# 修复 git pull
sed -i 's|git pull origin main || git pull origin master|git pull origin master|' deploy/update-server-cn.sh

# 修复路径
sed -i 's|dos2unix "\$BASE_DIR/deploy/start-api.sh"|dos2unix "\$BASE_DIR/project/deploy/start-api.sh"|g' deploy/update-server-cn.sh
sed -i 's|dos2unix "\$BASE_DIR/deploy/start-web.sh"|dos2unix "\$BASE_DIR/project/deploy/start-web.sh"|g' deploy/update-server-cn.sh
sed -i 's|chmod +x "\$BASE_DIR/deploy/start-api.sh" "\$BASE_DIR/deploy/start-web.sh"|chmod +x "\$BASE_DIR/project/deploy/start-api.sh" "\$BASE_DIR/project/deploy/start-web.sh"|g' deploy/update-server-cn.sh

echo "修复完成，开始执行部署..."
bash deploy/update-server-cn.sh
