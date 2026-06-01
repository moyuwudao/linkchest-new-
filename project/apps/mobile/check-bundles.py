import os

files = [
    '/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle',
    '/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/intermediates/assets/chinaRelease/index.android.bundle',
]

for f in files:
    if os.path.exists(f):
        with open(f, 'rb') as file:
            data = file.read(20)
        print(f'File: {f}')
        print(f'  Size: {os.path.getsize(f)} bytes')
        print(f'  Header: {data[:8].hex()}')
        print(f'  Is Hermes: {data[:4] == b"\xc6\x1f\xbc\x03"}')
        print()
