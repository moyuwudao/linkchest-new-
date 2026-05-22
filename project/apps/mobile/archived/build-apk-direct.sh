#!/bin/bash
set -e

export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/bin:/bin:$PATH

cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 使用本地缓存的 Gradle，绕过 wrapper
GRADLE_HOME=/home/mayn/.gradle/wrapper/dists/gradle-8.8-all/cgq7lt248yu0xgohgi051w98x/gradle-8.8

# 构建 classpath
CP=""
for f in "$GRADLE_HOME"/lib/*.jar; do
  CP="$CP:$f"
done
for f in "$GRADLE_HOME"/lib/plugins/*.jar; do
  CP="$CP:$f"
done
CP="${CP#:}"

echo "=== Starting Gradle assembleRelease (using local cached Gradle) ==="
java -cp "$CP" org.gradle.launcher.GradleMain assembleRelease --no-daemon --no-configuration-cache 2>&1 | tee /tmp/gradle-build.log

echo "=== Gradle exit code: ${PIPESTATUS[0]} ==="

if [ -f app/build/outputs/apk/release/app-release.apk ]; then
    echo "=== APK BUILD SUCCESS ==="
    ls -lh app/build/outputs/apk/release/app-release.apk
else
    echo "=== APK NOT FOUND - build may have failed ==="
    tail -50 /tmp/gradle-build.log
    exit 1
fi
