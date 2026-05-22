@echo off
chcp 65001 >nul
echo ========================================
echo LinkChest Android APK 构建脚本 (WSL)
echo ========================================
echo.

cd /d "%~dp0"
echo 项目路径: %cd%
echo.

REM 构建命令
wsl -d linkchest -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android && export ANDROID_HOME=/opt/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:$PATH && ./gradlew assembleRelease --no-daemon --no-configuration-cache"

echo.
echo ========================================
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo 构建成功！
    echo APK 路径: %cd%\android\app\build\outputs\apk\release\app-release.apk
    echo.
    explorer.exe "%cd%\android\app\build\outputs\apk\release"
) else (
    echo 构建失败或找不到 APK 文件
)
echo ========================================
pause
