#!/bin/bash
# Build wrapper with setsid to detach from controlling terminal
cd /mnt/d/trae_projects/linkchest/project/apps/mobile

# Use setsid to detach, and redirect all output to a persistent log file on /mnt/d
LOG_FILE="/mnt/d/trae_projects/linkchest/build-cn-output.log"
exec > "$LOG_FILE" 2>&1

bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china
