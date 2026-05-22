#!/bin/bash
# 构建国内版 APK 脚本
set -e

echo "=== 构建 LinkChest 国内版 APK ==="

# 1. 修改 app.json 的 market 字段为 china
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
node -e "
const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
appJson.expo.extra.market = 'china';
fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
console.log('✅ app.json market 已设置为 china');
"

# 2. 构建国内版 APK
cd android
./gradlew assembleChinaRelease --no-daemon --no-configuration-cache

echo "=== 国内版 APK 构建完成 ==="
echo "输出文件: app/build/outputs/apk/china/release/linkchest-china-release.apk"
