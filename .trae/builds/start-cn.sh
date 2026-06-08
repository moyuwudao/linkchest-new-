#!/bin/bash
# 国内版构建守护脚本
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
nohup setsid bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china > /mnt/d/trae_projects/linkchest/.trae/builds/wsl-cn-retry4.log 2>&1 < /dev/null &
echo "STARTED_PID=$!"
disown
exit 0
