#!/bin/bash
set -e

echo "=== Searching for Metro cache ==="

# Check tmp dirs
for tmpdir in /tmp /var/tmp "$TMPDIR"; do
    if [ -n "$tmpdir" ] && [ -d "$tmpdir" ]; then
        echo "--- Checking $tmpdir ---"
        find "$tmpdir" -maxdepth 2 -name "*metro*" -type d 2>/dev/null || true
    fi
done

# Check home dir
echo "--- Checking home dir ---"
find ~ -maxdepth 2 -name "*metro*" -type d 2>/dev/null || true
find ~ -maxdepth 2 -name ".metro*" 2>/dev/null || true

# Check project dir
echo "--- Checking project dir ---"
find /mnt/d/trae_projects/linkchest/project/apps/mobile -name "*metro*" -type d 2>/dev/null || true
find /mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/.cache -maxdepth 2 -type d 2>/dev/null || true

# Check if metro-cache package exists
echo "--- Metro cache package location ---"
find /mnt/d/trae_projects/linkchest/project/node_modules -name "metro-cache" -type d 2>/dev/null | head -3

# Check React Native Gradle plugin cache
echo "--- Checking Gradle RN plugin cache ---"
find /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build-china -name "*.bin" -o -name "*.json" | grep -i bundle | head -10 || true

# Check for any file containing "metro" in build dir
echo "--- Any metro-related files in build dir ---"
find /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build-china -name "*metro*" 2>/dev/null | head -10 || true
