import zipfile
import sys
import os

apk_path = r'D:\trae_projects\linkchest\project\apps\mobile\android\build-global\outputs\apk\global\release\linkchest-global-202606031114.apk'
size = os.path.getsize(apk_path)
print(f"APK size: {size} bytes ({size/1024/1024:.1f} MB)")

with zipfile.ZipFile(apk_path, 'r') as z:
    names = z.namelist()
    print(f"\nTotal entries: {len(names)}")
    print("\n=== assets/* entries ===")
    for n in names:
        if 'assets' in n or 'app.config' in n or 'index.android' in n:
            info = z.getinfo(n)
            print(f"  {n}  ({info.file_size} bytes)")

    # 找 assets 目录
    assets = [n for n in names if n.startswith('assets/')]
    print(f"\n=== assets count: {len(assets)} ===")

    # 读 AndroidManifest 看 package
    try:
        with z.open('AndroidManifest.xml') as f:
            data = f.read()
            print(f"\nAndroidManifest.xml first 200 bytes: {data[:200]}")
    except KeyError:
        print("AndroidManifest.xml not found in apk (binary xml)")

    # 尝试找 META-INF/com/android/build/gradle/app-metadata.properties
    try:
        with z.open('META-INF/com/android/build/gradle/app-metadata.properties') as f:
            print(f"\napp-metadata.properties: {f.read().decode('utf-8', errors='replace')}")
    except KeyError:
        pass

    # 找所有 top-level dirs
    top_dirs = set()
    for n in names:
        if '/' in n:
            top_dirs.add(n.split('/')[0])
    print(f"\n=== top-level dirs: {sorted(top_dirs)}")
