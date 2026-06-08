@echo off
setlocal
cd /d "D:\trae_projects\linkchest\project\apps\mobile\android"
set MARKET=china
set WSL_DISTRO_NAME=linkchest-cn
set BUILD_DIR_NAME=build-china
gradlew.bat :app:assembleChinaRelease --no-daemon
