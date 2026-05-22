#!/bin/bash
echo "=== Rebuilding global server ==="
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api/apps/web && rm -rf .next && npm run build && pm2 restart all"
echo "✅ Build and restart complete!"
