#!/bin/bash
# 临时修复国内服务器路径问题
cd /opt/linkchest/api/project
sed -i 's|dos2unix "\$BASE_DIR/deploy/start-api.sh"|dos2unix "\$BASE_DIR/project/deploy/start-api.sh"|g' deploy/update-server-cn.sh
sed -i 's|dos2unix "\$BASE_DIR/deploy/start-web.sh"|dos2unix "\$BASE_DIR/project/deploy/start-web.sh"|g' deploy/update-server-cn.sh
sed -i 's|chmod +x "\$BASE_DIR/deploy/start-api.sh" "\$BASE_DIR/deploy/start-web.sh"|chmod +x "\$BASE_DIR/project/deploy/start-api.sh" "\$BASE_DIR/project/deploy/start-web.sh"|g' deploy/update-server-cn.sh
echo "路径修复完成"
