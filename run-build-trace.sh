#!/bin/bash
# Trace the build to find exit point
set +e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
bash -x /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china > /mnt/d/trae_projects/linkchest/build-trace.log 2>&1
exit_code=$?
echo "BUILD_EXIT_CODE=${exit_code}" >> /mnt/d/trae_projects/linkchest/build-trace.log
echo "LAST_LINES:" >> /mnt/d/trae_projects/linkchest/build-trace.log
tail -30 /mnt/d/trae_projects/linkchest/build-trace.log >> /mnt/d/trae_projects/linkchest/build-trace.log
exit ${exit_code}
