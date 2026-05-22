#!/bin/bash
cd /tmp
rm -rf apk-check4
mkdir apk-check4
cd apk-check4
unzip -q /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk

echo '=== anydpi-v26 ic_launcher_foreground size ==='
ls -lh res/BJ.png

echo ''
echo '=== xxxhdpi ic_launcher_foreground size ==='
ls -lh res/as.png

echo ''
echo '=== Compare with source ==='
ls -lh /mnt/d/trae_projects/linkchest/project/assets/icons/android/ic_launcher_foreground.png

echo ''
echo '=== anydpi-v26 ic_launcher.xml (BW.xml) ==='
cat res/BW.xml
