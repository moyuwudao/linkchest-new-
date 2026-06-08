@echo off
:: 启动海外版构建（独立进程）
start "WSL-Global-Build" /B wsl -d linkchest-global -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile && exec bash build-gradle.sh global > /mnt/d/trae_projects/linkchest/.trae/builds/wsl-global-build.log 2>&1"
echo GLOBAL_LAUNCHED at %time%
