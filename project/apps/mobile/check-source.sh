#!/bin/bash
echo "=== Checking en.json in WSL ==="
cat /mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/en.json | grep -c '"pro"'
cat /mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/en.json | grep -A1 '"pro"'
echo "=== Checking terms-content.json in WSL ==="
cat /mnt/d/trae_projects/linkchest/project/apps/mobile/src/screens/terms-content.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('zh has linkchest.cn:', 'linkchest.cn' in d['zh']); print('zh has wechat:', '微信' in d['zh'])"
echo "=== Checking APK bundle ==="
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
unzip -p build-china/outputs/apk/china/release/linkchest-china-202606011244.apk assets/index.android.bundle > /tmp/bundle.txt
strings /tmp/bundle.txt | grep -c '"pro":"Pro"'
strings /tmp/bundle.txt | grep -c '"super":"Ultimate"'
echo "=== Checking if bundle contains old tier.pro key ==="
strings /tmp/bundle.txt | grep -c 'tier\.pro'
