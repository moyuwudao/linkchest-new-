#!/bin/bash
# 复制修复后的图标到 Android 项目

for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    src_dir="/mnt/d/trae_projects/linkchest/project/assets/icons/android/mipmap-${dir}"
    dst_dir="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/src/main/res/mipmap-${dir}"
    
    cp "${src_dir}/ic_launcher.png" "${dst_dir}/ic_launcher.png"
    cp "${src_dir}/ic_launcher_round.png" "${dst_dir}/ic_launcher_round.png"
    echo "Copied mipmap-${dir}"
done

# 复制前景图到所有密度目录
for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    dst_dir="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/src/main/res/mipmap-${dir}"
    cp "/mnt/d/trae_projects/linkchest/project/assets/icons/android/ic_launcher_foreground.png" "${dst_dir}/ic_launcher_foreground.png"
    echo "Copied foreground to mipmap-${dir}"
done

echo "=== All icons copied ==="
ls -la /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/
