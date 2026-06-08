#!/bin/bash
# 启动构建并立刻退出（不阻塞）
# 用 nohup + & + disown 让构建完全脱离本脚本
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 启动构建
nohup bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china > /tmp/wsl-build-china-full.log 2>&1 &
BUILD_PID=$!
disown $BUILD_PID

# 立即返回构建信息
echo "Build started successfully"
echo "PID=$BUILD_PID"
echo "Log file: /tmp/wsl-build-china-full.log"
echo "---"
echo "Sleep 3s then check process status..."
sleep 3
if kill -0 $BUILD_PID 2>/dev/null; then
    echo "✅ Process $BUILD_PID is alive"
else
    echo "❌ Process $BUILD_PID exited"
    echo "--- Last 30 lines of log ---"
    tail -n 30 /tmp/wsl-build-china-full.log
fi
