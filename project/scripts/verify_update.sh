#!/bin/bash
cd /opt/linkchest/api/apps/web
echo "=== Verifying update ==="
echo ""
echo "1. Checking settings page for extension..."
grep -n 'extension' "src/app/(main)/settings/page.tsx"
echo ""
echo "2. Checking translation file..."
grep -n 'extensionDownload' src/lib/locales/zh.json
echo ""
echo "3. Checking CollectionViewConfig location..."
grep -n 'CollectionViewConfig' "src/app/(main)/settings/page.tsx"