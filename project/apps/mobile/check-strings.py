import re
import subprocess

bundle_path = '/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle'

# Use strings command
result = subprocess.run(['strings', bundle_path], capture_output=True, text=True)
strings_output = result.stdout

print("Searching for 'locales' in strings output:")
matches = [line for line in strings_output.split('\n') if 'locales' in line]
for m in matches[:20]:
    print(f"  {m}")

print(f"\nTotal matches for 'locales': {len(matches)}")

print("\nSearching for 'en.json' in strings output:")
matches = [line for line in strings_output.split('\n') if 'en.json' in line]
for m in matches[:20]:
    print(f"  {m}")

print(f"\nTotal matches for 'en.json': {len(matches)}")

print("\nSearching for 'zh.json' in strings output:")
matches = [line for line in strings_output.split('\n') if 'zh.json' in line]
for m in matches[:20]:
    print(f"  {m}")

print(f"\nTotal matches for 'zh.json': {len(matches)}")
