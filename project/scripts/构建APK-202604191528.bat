@echo off
chcp 65001 >nul 2>&1
title LinkChest - Build Release APK
cls
echo ========================================
echo   LinkChest - Build Release APK
echo   一键构建工具 v2.0
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "MOBILE_DIR=%SCRIPT_DIR%apps\mobile"
set "ANDROID_DIR=%MOBILE_DIR%\android"
set "OUTPUT_DIR=%MOBILE_DIR%\dist"
set "WEB_PUBLIC=%SCRIPT_DIR%apps\web\public"

for /f "delims=" %%i in ('node -e "console.log(require('./apps/mobile/app.json').expo.version)"') do set "BUILD_VERSION=%%i"

echo   Version: %BUILD_VERSION%
echo   Output:  %OUTPUT_DIR%
echo.

set "GRADLE_USER_HOME=D:\.gradle"
set "NODE_PATH=%MOBILE_DIR%\node_modules"

echo [1/6] 检查环境...
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo   [FAIL] 未找到 Java，请安装 Java 17+
    pause
    exit /b 1
)
java -version 2>&1 | findstr "version" | findstr "17\|21" >nul
if %errorlevel% neq 0 (
    echo   [WARN] 建议使用 Java 17 或 21
)
echo   [OK] Java 环境正常

echo.
echo [2/6] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [FAIL] 未找到 Node.js，请安装后重试
    pause
    exit /b 1
)
node -v | findstr "v18\|v20\|v21\|v22" >nul
if %errorlevel% neq 0 (
    echo   [WARN] 建议使用 Node.js 18+
)
echo   [OK] Node.js 环境正常

echo.
echo [3/6] 检查依赖安装...
if not exist "%MOBILE_DIR%\node_modules" (
    echo   [INFO] 正在安装依赖...
    cd /d "%MOBILE_DIR%"
    npm install --legacy-peer-deps --audit=false
    if %errorlevel% neq 0 (
        echo   [WARN] npm 返回非零状态，继续尝试...
    )
)
if exist "%MOBILE_DIR%\node_modules" (
    echo   [OK] 依赖已安装
) else (
    echo   [FAIL] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [4/6] 清理构建缓存...
call "%ANDROID_DIR%\gradlew.bat" -p "%ANDROID_DIR%" clean
if %errorlevel% neq 0 (
    echo   [WARN] 清理缓存时出现警告
)
echo   [OK] 缓存已清理

echo.
echo [5/6] 构建 Release APK (约需 3-5 分钟)...
echo   [提示] 首次构建会下载依赖，请耐心等待...
call "%ANDROID_DIR%\gradlew.bat" -p "%ANDROID_DIR%" assembleRelease
if %errorlevel% neq 0 (
    echo.
    echo   [FAIL] 构建失败，请检查上方错误信息
    pause
    exit /b 1
)
echo   [OK] 构建成功

echo.
echo [6/6] 复制输出文件...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

set "APK_SOURCE=%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk"
set "APK_DEST=%OUTPUT_DIR%\LinkChest-%BUILD_VERSION%.apk"

if exist "%APK_SOURCE%" (
    copy /y "%APK_SOURCE%" "%APK_DEST%" >nul
    for %%A in ("%APK_DEST%") do set "APK_SIZE=%%~zA"
    set /a APK_SIZE_MB=APK_SIZE/1024/1024
    echo   [OK] 输出: LinkChest-%BUILD_VERSION%.apk (%APK_SIZE_MB% MB)
) else (
    echo   [FAIL] APK 文件未找到
    dir /s /b "%ANDROID_DIR%\app\build\outputs\apk\release\*.apk" 2>nul
    pause
    exit /b 1
)

echo.
echo [附加] 同步到 Web 目录...
if not exist "%WEB_PUBLIC%" mkdir "%WEB_PUBLIC%"

copy /y "%APK_DEST%" "%WEB_PUBLIC%\LinkChest.apk" >nul
if %errorlevel% equ 0 (
    echo   [OK] 已复制到 web/public/LinkChest.apk
) else (
    echo   [WARN] 复制到 web/public 失败
)

node -e "const fs=require('fs');const v=require('./apps/mobile/app.json').expo.version;const out=process.env.WEB_PUBLIC+'\\version.json';fs.writeFileSync(out,JSON.stringify({version:v,buildDate:new Date().toISOString(),downloadUrl:'/LinkChest.apk',size:'%APK_SIZE_MB% MB',minAndroid:'Android 8.0+',forceUpdate:false},null,2));"
echo   [OK] 已生成 version.json

echo.
echo ========================================
echo   构建完成！
echo ========================================
echo.
echo   版本: %BUILD_VERSION%
echo   输出: %APK_DEST%
echo   Web:  %WEB_PUBLIC%\LinkChest.apk
echo.
echo   下一步：
echo   1. 将 APK 上传到下载服务器
echo   2. 运行 deploy-server.bat 部署到生产环境
echo.
start "" "%OUTPUT_DIR%"
pause