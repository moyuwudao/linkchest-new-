#!/bin/bash
set -e

GRADLE_PROPS="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties"
BUILD_GRADLE="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build.gradle"
GRADLE_PROPERTIES="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/gradle.properties"

echo "=== Fixing Gradle mirror ==="
sed -i 's|https://services.gradle.org/distributions/|https://mirrors.cloud.tencent.com/gradle/|g' "$GRADLE_PROPS"
echo "distributionUrl after fix:"
grep distributionUrl "$GRADLE_PROPS"

echo ""
echo "=== Fixing Maven repositories in build.gradle ==="
if grep -q "maven.aliyun.com" "$BUILD_GRADLE"; then
    echo "Aliyun mirror already configured"
else
    sed -i 's|repositories {|repositories {\n        maven { url '"'"'https://maven.aliyun.com/repository/google'"'"' }\n        maven { url '"'"'https://maven.aliyun.com/repository/public'"'"' }\n        maven { url '"'"'https://maven.aliyun.com/repository/gradle-plugin'"'"' }|' "$BUILD_GRADLE"
    echo "Aliyun mirror added"
fi

echo ""
echo "=== Enabling Gradle caching ==="
sed -i 's|# org.gradle.caching=true|org.gradle.caching=true|g' "$GRADLE_PROPERTIES"
sed -i 's|# org.gradle.parallel=true|org.gradle.parallel=true|g' "$GRADLE_PROPERTIES"
echo "Caching config after fix:"
grep -E 'caching|parallel' "$GRADLE_PROPERTIES"

echo ""
echo "=== All fixes applied ==="
