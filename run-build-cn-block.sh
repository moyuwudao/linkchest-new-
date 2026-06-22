#!/bin/bash
# Final build runner - all bash, no $? expansion by PowerShell
set +e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
LOG="/mnt/d/trae_projects/linkchest/build-cn-final.log"
echo "Build started: $(date)" > "$LOG"
bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china >> "$LOG" 2>&1
EC=$?
echo "----" >> "$LOG"
echo "Build finished: $(date)" >> "$LOG"
echo "BUILD_EXIT_CODE=${EC}" >> "$LOG"
exit 0
