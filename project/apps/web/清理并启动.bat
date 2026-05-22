@echo off
chcp 65001 >nul
cd /d "C:\Users\Mayn\CodeBuddy\20260407184558\apps\web"

echo 清理缓存...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo 启动服务...
npm run dev
