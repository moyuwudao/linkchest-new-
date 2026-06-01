import zipfile

apk_path = '/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-202606011310.apk'

with zipfile.ZipFile(apk_path, 'r') as z:
    files = z.namelist()
    
    print("JSON files in APK:")
    for f in sorted(files):
        if f.endswith('.json'):
            print(f"  {f}")
    
    print("\nFiles containing 'locales':")
    for f in sorted(files):
        if 'locales' in f:
            print(f"  {f}")
    
    print("\nAll asset files (assets/):")
    for f in sorted(files):
        if f.startswith('assets/'):
            print(f"  {f}")
