#!/bin/bash
APK=/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606182307.apk
echo "=== APK 完整文件清单（前 30 行）==="
unzip -l "$APK" 2>/dev/null | head -40
echo ""
echo "=== 查找 locales / 翻译 / .json 文件 ==="
unzip -l "$APK" 2>/dev/null | grep -iE "locale|i18n|translation|json|zh|en" | head -30
echo ""
echo "=== 检查 raw 资源 ==="
unzip -l "$APK" 2>/dev/null | grep -E "res/raw" | head -20
