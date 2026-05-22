#!/bin/bash
for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    cp /mnt/d/trae_projects/linkchest/project/assets/icons/android/mipmap-${dir}/ic_launcher.png /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png
    echo "Round ${dir} done"
done
