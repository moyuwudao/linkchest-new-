#!/bin/bash
cd /opt/linkchest/api/apps/web
echo "=== Checking settings page ==="
grep -n 'CollectionViewConfig' "src/app/(main)/settings/page.tsx"
echo ""
echo "=== Checking for extension ==="
grep -n 'extension' "src/app/(main)/settings/page.tsx"
echo ""
echo "=== Checking translation file ==="
grep -n 'extensionDownload' src/lib/locales/zh.json