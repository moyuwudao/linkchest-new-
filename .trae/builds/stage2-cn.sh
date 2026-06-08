#!/bin/bash
# 国内版构建 - 阶段2: 跑 Gradle (MARKET/WSL_DISTRO_NAME 已设置)
set -e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
export MARKET=china
export WSL_DISTRO_NAME=linkchest-cn
export BUILD_DIR_NAME=build-china
./gradlew :app:assembleChinaRelease --no-daemon --build-cache 2>&1
