@echo off
chcp 65001 >nul 2>&1
title LinkChest - Build AAB for Google Play
cls
echo ============================================
echo   LinkChest - Google Play 上架构建工具
echo   输出格式: Android App Bundle (.aab)
echo ============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "MOBILE_DIR=%SCRIPT_DIR%apps\mobile"
set "ANDROID_DIR=%MOBILE_DIR%\android"
set "OUTPUT_DIR=%SCRIPT_DIR%dist"

REM 读取版本号
for /f "tokens=*" %%a in ('node -e "console.log(require('./apps/mobile/app.json').expo.version)" 2^>nul') do set "APP_VERSION=%%a"
if "%APP_VERSION%"=="" set "APP_VERSION=1.0.0"

REM 读取versionCode
for /f "tokens=*" %%a in ('powershell -Command "Get-Content '%ANDROID_DIR%\app\build.gradle' | Select-String -Pattern 'versionCode\\s+(\\d+)' | ForEach-Object { $_.Matches.Groups[1].Value }"') do set "VERSION_CODE=%%a"
if "%VERSION_CODE%"=="" set "VERSION_CODE=1000"

set "BUILD_VERSION=%APP_VERSION%-vc%VERSION_CODE%"

echo [配置信息]
echo   应用版本: %APP_VERSION%
echo   内部版本: %VERSION_CODE%
echo   构建版本: %BUILD_VERSION%
echo   输出目录: %OUTPUT_DIR%
echo.
echo [提示] 每次上传Google Play前，请手动递增 build.gradle 中的 versionCode
echo.

REM 检查Java
echo [1/7] 检查环境...
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo   [错误] 未找到 Java，请安装 Java 17 或更高版本
    pause
    exit /b 1
)
java -version 2>&1 | findstr "version" | findstr "17\|21" >nul
if %errorlevel% neq 0 (
    echo   [警告] 建议安装 Java 17 或 21 以获得最佳兼容性
)
echo   [OK] Java 环境

REM 检查签名配置
echo.
echo [2/7] 检查签名配置...
if not exist "%ANDROID_DIR%\app\linkchest-upload.keystore" (
    echo.
    echo   [错误] 未找到签名密钥库！
    echo.
    echo   请先在终端运行以下命令生成密钥：
    echo   ============================================
    echo   cd "%ANDROID_DIR%\app"
    echo.
    echo   keytool -genkeypair -v -storetype PKCS12 ^
    echo     -keystore linkchest-upload.keystore ^
    echo     -alias linkchest ^
    echo     -keyalg RSA ^
    echo     -keysize 2048 ^
    echo     -validity 10000
    echo   ============================================
    echo.
    echo   填写说明（个人开发者）：
    echo     - 姓名：你的真实姓名（拼音或中文）
    echo     - 组织单位：可直接回车跳过
    echo     - 组织：可直接回车跳过  
    echo     - 城市：你所在城市
    echo     - 省份：你所在省份
    echo     - 国家：CN
    echo.
    echo   设置密码后，编辑此文件配置签名信息
    pause
    exit /b 1
)
echo   [OK] 密钥库已存在

REM 检查gradle配置
echo.
echo [3/7] 检查 Gradle 签名配置...
findstr /C:"MYAPP_UPLOAD_STORE_FILE" "%ANDROID_DIR%\gradle.properties" >nul
if %errorlevel% neq 0 (
    echo   [提示] 首次使用需要配置签名密码
    echo.
    echo   请编辑文件：%ANDROID_DIR%\gradle.properties
    echo   取消最后4行的注释并填入你的密码：
    echo.
    echo   MYAPP_UPLOAD_STORE_FILE=linkchest-upload.keystore
    echo   MYAPP_UPLOAD_KEY_ALIAS=linkchest
    echo   MYAPP_UPLOAD_STORE_PASSWORD=你的密码
    echo   MYAPP_UPLOAD_KEY_PASSWORD=你的密码
    echo.
    pause
    exit /b 1
)
echo   [OK] 签名配置已设置

REM 清理旧构建
echo.
echo [4/7] 清理构建缓存...
cd /d "%ANDROID_DIR%"
call .\gradlew clean
echo   [OK] 缓存已清理

REM 构建Bundle
echo.
echo [5/7] 构建 Release AAB (约需 3-5 分钟)...
echo   [提示] 首次构建会下载依赖，请耐心等待...
echo.
call .\gradlew :app:bundleRelease

if %errorlevel% neq 0 (
    echo.
    echo   [错误] 构建失败！请检查上方错误信息
    echo   常见问题：
    echo     1. 检查 gradle.properties 中的密码是否正确
    echo     2. 检查密钥库别名是否正确
    echo     3. 确保 Java 版本兼容
    pause
    exit /b 1
)
echo   [OK] 构建成功

REM 复制输出
echo.
echo [6/7] 复制输出文件...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

set "AAB_SOURCE=%ANDROID_DIR%\app\build\outputs\bundle\release\app-release.aab"
set "AAB_DEST=%OUTPUT_DIR%\LinkChest-%BUILD_VERSION%.aab"

if exist "%AAB_SOURCE%" (
    copy /y "%AAB_SOURCE%" "%AAB_DEST%" >nul
    echo   [OK] AAB 文件已复制
) else (
    echo   [错误] 未找到 AAB 文件
    dir /s /b "%ANDROID_DIR%\app\build\outputs\bundle\release\*.aab" 2>nul
    pause
    exit /b 1
)

REM 生成构建报告
echo.
echo [7/7] 生成构建报告...
set "REPORT_FILE=%OUTPUT_DIR%\LinkChest-%BUILD_VERSION%-info.txt"
(
echo LinkChest Google Play 构建信息
echo ============================================
echo 构建时间: %date% %time%
echo 应用版本: %APP_VERSION%
echo 内部版本: %VERSION_CODE%
echo 构建版本: %BUILD_VERSION%
echo 包名: com.linkchest.app
echo 输出文件: LinkChest-%BUILD_VERSION%.aab
echo.
echo 文件大小:
for %%F in ("%AAB_DEST%") do echo   %%~zF 字节
echo.
echo Google Play 上传步骤：
echo 1. 访问 https://play.google.com/console
echo 2. 创建应用，填写应用信息
echo 3. 进入"发布" - "正式版" - "创建发布"
echo 4. 上传此 AAB 文件
echo 5. 填写内容分级问卷
echo 6. 设置定价和分发地区
echo 7. 提交审核
echo.
echo [重要提醒]
echo 如需再次构建上传，请先修改 build.gradle 中的 versionCode
echo 将 versionCode %VERSION_CODE% 改为 %VERSION_CODE%+1
echo.
echo ============================================
) > "%REPORT_FILE%"
echo   [OK] 构建报告已生成

REM 完成
echo.
echo ============================================
echo       构建完成！
echo ============================================
echo.
echo 输出文件：
echo   %AAB_DEST%
echo.
echo 构建信息：
echo   %REPORT_FILE%
echo.
echo [重要提醒]
echo   当前 versionCode: %VERSION_CODE%
echo   如需再次构建上传，请先修改：
echo   %ANDROID_DIR%\app\build.gradle
echo   将 versionCode %VERSION_CODE% 改为 %VERSION_CODE%+1
echo.
echo 下一步：
echo   1. 访问 Google Play Console: https://play.google.com/console
echo   2. 上传 %AAB_DEST%
echo.

REM 打开输出目录
start "" "%OUTPUT_DIR%"

pause
