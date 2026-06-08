#!/bin/bash
# 海外版构建 - 阶段2: 跑 Gradle (MARKET/WSL_DISTRO_NAME 已设置)
set -e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
export MARKET=global
export WSL_DISTRO_NAME=linkchest-global
export BUILD_DIR_NAME=build-global
./gradlew :app:assembleGlobalRelease --no-daemon --build-cache 2>&1
