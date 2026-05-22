#!/bin/bash
echo "=== Verifying cover editor update ==="
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api/apps/web/src/components && grep -A 10 -B 2 'modeAi' CoverEditor.tsx"
