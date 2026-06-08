#!/bin/bash
# WSL 端启动器：在 linkchest-cn 实例中后台执行构建
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
nohup bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china > /tmp/wsl-build-china.out 2>&1 &
echo "PID=$!"
sleep 2
echo "Process check:"
ps -p $! && echo "Process is running" || echo "Process exited"
