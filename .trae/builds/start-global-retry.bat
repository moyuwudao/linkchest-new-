@echo off
:: 启动海外版重新构建（独立进程）
start "WSL-Global-Build" /B wsl -d linkchest-global -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile && exec bash build-gradle.sh global > /mnt/d/trae_projects/linkchest/.trae/builds/wsl-global-retry.log 2>&1"
echo GLOBAL_RETRY_LAUNCHED at %time%
