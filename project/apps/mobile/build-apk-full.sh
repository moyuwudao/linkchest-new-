#!/bin/bash
set -e

cd /mnt/d/trae_projects/linkchest/project/apps/mobile

export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:$PATH

echo "=== Step 1: Expo prebuild (without --clean) ==="
echo "y" | npx expo prebuild --platform android

echo "=== Step 2: Fix Gradle mirror ==="
cat > android/gradle/wrapper/gradle-wrapper.properties << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.8-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

echo "=== Step 3: Fix Maven mirrors in build.gradle ==="
sed -i "s|google()|maven { url 'https://maven.aliyun.com/repository/google' }|g" android/build.gradle
sed -i "s|mavenCentral()|maven { url 'https://maven.aliyun.com/repository/public' }\n        mavenCentral()|g" android/build.gradle

echo "=== Step 4: Restore icons ==="
for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    if [ -f "assets/icons/android/mipmap-${dir}/ic_launcher.png" ]; then
        cp "assets/icons/android/mipmap-${dir}/ic_launcher.png" \
           "android/app/src/main/res/mipmap-${dir}/ic_launcher.png"
        cp "assets/icons/android/mipmap-${dir}/ic_launcher.png" \
           "android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png"
    fi
    if [ -f "assets/icons/android/ic_launcher_foreground.png" ]; then
        cp "assets/icons/android/ic_launcher_foreground.png" \
           "android/app/src/main/res/mipmap-${dir}/ic_launcher_foreground.png"
    fi
done

echo "=== Step 5: Build APK ==="
cd android
./gradlew assembleRelease --no-daemon --no-configuration-cache

echo "=== Step 6: Verify and Rename APK ==="
APK_DIR="app/build/outputs/apk/release"
APK_ORIGINAL="$APK_DIR/app-release.apk"

if [ -f "$APK_ORIGINAL" ]; then
    # 生成带时间戳的APK文件名: linkchest-YYYYMMDD-HHMM.apk
    TIMESTAMP=$(date +"%Y%m%d-%H%M")
    APK_RENAMED="$APK_DIR/linkchest-$TIMESTAMP.apk"

    mv "$APK_ORIGINAL" "$APK_RENAMED"

    echo "=== APK BUILD SUCCESS ==="
    echo "Original: app-release.apk"
    echo "Renamed:  linkchest-$TIMESTAMP.apk"
    ls -lh "$APK_RENAMED"
else
    echo "=== APK NOT FOUND - build may have failed ==="
    exit 1
fi
