@echo off
:: 启动国内版构建（独立进程）
start "WSL-China-Build" /B wsl -d linkchest-cn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile && exec bash build-gradle.sh china > /mnt/d/trae_projects/linkchest/.trae/builds/wsl-cn-build.log 2>&1"
echo CHINA_LAUNCHED at %time%
