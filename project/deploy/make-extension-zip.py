import zipfile
import os

os.chdir('/opt/linkchest/api/project/apps/chrome-extension')

z = zipfile.ZipFile('linkchest-chrome-extension-v1.1.0.zip', 'w', zipfile.ZIP_DEFLATED)

for root, dirs, files in os.walk('dist'):
    for f in files:
        if not f.endswith('.map'):
            path = os.path.join(root, f)
            arcname = os.path.relpath(path, '.')
            z.write(path, arcname)

for root, dirs, files in os.walk('public'):
    for f in files:
        path = os.path.join(root, f)
        arcname = os.path.relpath(path, '.')
        z.write(path, arcname)

z.close()

size = os.path.getsize('linkchest-chrome-extension-v1.1.0.zip')
print(f'ZIP created: {size} bytes')
