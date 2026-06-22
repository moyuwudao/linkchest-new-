#!/bin/bash
set -e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
export BUILD_DIR_NAME=build-china
export MARKET=china
export WSL_DISTRO_NAME=linkchest-cn
export GRADLE_USER_HOME=$HOME/.gradle
export REACT_NATIVE_METRO_CACHE_DIR=/tmp/metro-cache-linkchest-cn
echo "sdk.dir=/opt/android-sdk" > local.properties
./gradlew assembleChinaRelease --no-daemon
