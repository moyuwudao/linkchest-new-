#!/bin/bash
cd /tmp
rm -rf apk-check3
mkdir apk-check3
cd apk-check3
unzip -q /mnt/d/trae_projects/linkchest/project/apps/mobile/dist/LinkChest-release.apk

echo '=== All resource directories ==='
ls -la res/ | head -30

echo ''
echo '=== All mipmap directories ==='
ls -d res/mipmap* 2>/dev/null || echo 'No mipmap dirs found'

echo ''
echo '=== All png files (first 30) ==='
find res -name '*.png' | head -30

echo ''
echo '=== Search for anydpi ==='
find . -name '*anydpi*' -o -name '*v26*' | head -20

echo ''
echo '=== arsc file ==='
ls -la resources.arsc
