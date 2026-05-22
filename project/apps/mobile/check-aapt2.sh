#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export PATH=/opt/android-sdk/build-tools/34.0.0:$PATH

echo '=== AAPT2 dump - mipmap configs ==='
aapt2 dump resources /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk | grep -A 20 'type mipmap'

echo ''
echo '=== AAPT2 dump - all configs ==='
aapt2 dump configurations /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk | head -50
