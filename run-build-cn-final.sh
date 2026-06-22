#!/bin/bash
# Pure build runner - no $? in command, just runs build and exits
set +e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile
bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china
exit_code=$?
echo "BUILD_EXIT_CODE=${exit_code}" > /mnt/d/trae_projects/linkchest/build-result.txt
exit ${exit_code}
