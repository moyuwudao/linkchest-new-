#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export PATH=/opt/android-sdk/build-tools/34.0.0:$PATH

echo '=== AAPT2 dump resources ==='
aapt2 dump resources /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk | grep -i 'mipmap' | head -30

echo ''
echo '=== AAPT2 dump configurations ==='
aapt2 dump configurations /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk | grep -i 'mipmap' | head -20
