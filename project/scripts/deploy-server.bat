@echo off
chcp 65001 >nul 2>&1
title LinkChest - 一键部署到服务器
cls
echo ==========================================
echo   LinkChest 一键部署工具
echo   本地推送 + GitHub + 服务器部署
echo ==========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "DEPLOY_CONFIG=%SCRIPT_DIR%.env.deploy"
set "POWERSHELL_SCRIPT=%SCRIPT_DIR%deploy-server.ps1"

echo [检查] 验证部署配置...
if not exist "%DEPLOY_CONFIG%" (
    echo   [FAIL] 未找到部署配置文件
    echo.
    echo   请先创建配置文件:
    echo   ==========================================
    echo   复制 .env.deploy.example 为 .env.deploy
    echo   并填写以下配置:
    echo.
    echo   DEPLOY_SERVER_IP=你的服务器IP
    echo   DEPLOY_SSH_USER=ubuntu
    echo   DEPLOY_SSH_PASSWORD=你的SSH密码
    echo   ==========================================
    echo.
    pause
    exit /b 1
)
echo   [OK] 配置文件已找到

echo.
echo [检查] 验证 PowerShell 脚本...
if not exist "%POWERSHELL_SCRIPT%" (
    echo   [FAIL] 未找到部署脚本: %POWERSHELL_SCRIPT%
    pause
    exit /b 1
)
echo   [OK] 部署脚本已找到

echo.
echo [检查] 验证 Git 环境...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo   [FAIL] 未找到 Git，请安装后重试
    pause
    exit /b 1
)
echo   [OK] Git 环境正常

echo.
echo [检查] 验证 PowerShell...
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo   [FAIL] 未找到 PowerShell
    pause
    exit /b 1
)
echo   [OK] PowerShell 环境正常

echo.
echo [确认] 部署信息
echo ------------------------------------------
for /f "tokens=2 delims==" %%a in ('findstr /B "DEPLOY_SERVER_IP" "%DEPLOY_CONFIG%"') do set "SERVER_IP=%%a"
for /f "tokens=2 delims==" %%a in ('findstr /B "DEPLOY_SSH_USER" "%DEPLOY_CONFIG%"') do set "SSH_USER=%%a"
echo   服务器: %SERVER_IP%
echo   用户:   %SSH_USER%
echo ------------------------------------------
echo.
set "CONFIRM="
set /p "CONFIRM=确认继续部署吗? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo   部署已取消
    pause
    exit /b 0
)

echo.
echo [开始] 启动部署脚本...
echo   提示: 如果遇到连接问题，请检查:
echo         1. 服务器 IP 和端口是否正确
echo         2. SSH 密码或密钥是否正确
echo         3. 服务器防火墙是否允许连接
echo.
powershell -ExecutionPolicy Bypass -File "%POWERSHELL_SCRIPT%"

echo.
if %errorlevel% equ 0 (
    echo ==========================================
    echo   部署完成！
    echo ==========================================
    echo   服务器: http://%SERVER_IP%
    echo ==========================================
) else (
    echo ==========================================
    echo   部署失败，请检查错误信息
    echo ==========================================
)
echo.
pause