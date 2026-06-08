@echo off
setlocal
cd /d "D:\trae_projects\linkchest\project\apps\mobile\android"
set MARKET=global
set WSL_DISTRO_NAME=linkchest-global
set BUILD_DIR_NAME=build-global
gradlew.bat :app:assembleGlobalRelease --no-daemon
