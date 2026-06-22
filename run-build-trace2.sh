#!/bin/bash
# Full trace runner
set +e
LOG="/mnt/d/trae_projects/linkchest/build-cn-trace.log"
echo "===== BUILD TRACE START: $(date) =====" > "$LOG"
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
bash -x /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china >> "$LOG" 2>&1
EC=$?
echo "===== BUILD TRACE END: $(date) =====" >> "$LOG"
echo "EXIT_CODE=${EC}" >> "$LOG"
exit 0
