@echo off
chcp 65001 >nul
echo ========================================
echo LinkChest Mobile APK 一键构建脚本
echo ========================================
echo.

cd /d "%~dp0"
echo [1/3] Expo Prebuild - 生成 Android 原生项目...
echo.
echo Y | npx expo prebuild --platform android --clean 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Prebuild 失败！可能 build 目录仍被锁定。
    echo    请确保已重启电脑后再运行此脚本。
    pause
    exit /b 1
)
echo.
echo ✅ Prebuild 成功！
echo.

echo [2/3] Gradle 构建 Release APK (WSL)...
echo.
wsl -d linkchest -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android && export ANDROID_HOME=/opt/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH && ./gradlew assembleRelease --no-daemon --no-configuration-cache" 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Gradle 构建失败！
    pause
    exit /b 1
)
echo.
echo ✅ Gradle 构建成功！
echo.

echo [3/3] 复制 APK 到 dist 目录...
if not exist "dist" mkdir "dist"
copy /y "android\app\build\outputs\apk\release\app-release.apk" "dist\LinkChest-latest.apk" >nul 2>&1

echo.
echo ========================================
echo ✅ 全部完成！
echo   APK 路径: %cd%\dist\LinkChest-latest.apk
echo ========================================
explorer.exe "dist"
pause