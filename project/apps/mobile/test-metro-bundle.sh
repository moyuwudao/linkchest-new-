#!/bin/bash
set -e

cd /mnt/d/trae_projects/linkchest/project/apps/mobile

export NODE_ENV=production
export MARKET=china

# Run metro bundler directly
echo "=== Running Metro bundler directly ==="
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output /tmp/test-bundle.js \
  --assets-dest /tmp/test-assets

echo ""
echo "=== Checking bundle content ==="
strings /tmp/test-bundle.js | grep -c '"pro":"Pro"' || true
strings /tmp/test-bundle.js | grep -c '"super":"Ultimate"' || true
strings /tmp/test-bundle.js | grep -c 'tier\.pro' || true

echo ""
echo "=== Bundle size ==="
ls -la /tmp/test-bundle.js
