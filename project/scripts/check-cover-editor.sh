#!/bin/bash
cd /opt/linkchest/api/apps/web/src/components
echo "=== Checking CoverEditor.tsx ==="
grep -n "modeAi\|modeGradient\|modeLibrary\|modeUrl" CoverEditor.tsx
echo -e "\n=== Checking imports ==="
grep -n "import" CoverEditor.tsx | head -20
