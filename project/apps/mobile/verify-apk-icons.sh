#!/bin/bash
cd /tmp
rm -rf apk-check2
mkdir apk-check2
cd apk-check2
unzip -q /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk

echo '=== anydpi-v26 directory ==='
find . -path '*/mipmap-anydpi-v26/*' -type f | sort

echo ''
echo '=== anydpi-v26 file sizes ==='
for f in $(find . -path '*/mipmap-anydpi-v26/*' -type f | sort); do
    ls -lh "$f"
done

echo ''
echo '=== ic_launcher.xml configs ==='
find . -name 'ic_launcher.xml' -type f | head -5 | while read f; do
    echo "--- $f ---"
    cat "$f"
    echo ''
done

echo ''
echo '=== ic_launcher_foreground.png in anydpi-v26 ==='
find . -path '*/mipmap-anydpi-v26/ic_launcher_foreground.png' -exec ls -lh {} \;
