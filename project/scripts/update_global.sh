#!/bin/bash
echo "=== Updating global server ==="
cd /mnt/d/trae_projects/linkchest

echo "1. Copying settings page..."
scp "project/apps/web/src/app/(main)/settings/page.tsx" ubuntu@43.133.44.232:/tmp/page.tsx
ssh ubuntu@43.133.44.232 "mv /tmp/page.tsx /opt/linkchest/api/apps/web/src/app/(main)/settings/page.tsx"

echo "2. Copying translation files..."
scp "project/apps/web/src/lib/locales/zh.json" ubuntu@43.133.44.232:/tmp/zh.json
ssh ubuntu@43.133.44.232 "mv /tmp/zh.json /opt/linkchest/api/apps/web/src/lib/locales/zh.json"

scp "project/apps/web/src/lib/locales/en.json" ubuntu@43.133.44.232:/tmp/en.json
ssh ubuntu@43.133.44.232 "mv /tmp/en.json /opt/linkchest/api/apps/web/src/lib/locales/en.json"

echo "3. Rebuilding web..."
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api/apps/web && rm -rf .next && npx next build"

echo "4. Restarting pm2..."
ssh ubuntu@43.133.44.232 "pm2 restart linkchest-api-global"

echo "=== Update completed ==="