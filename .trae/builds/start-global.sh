#!/bin/bash
# 海外版构建守护脚本
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
nohup setsid bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh global > /mnt/d/trae_projects/linkchest/.trae/builds/wsl-global-retry4.log 2>&1 < /dev/null &
echo "STARTED_PID=$!"
disown
exit 0
