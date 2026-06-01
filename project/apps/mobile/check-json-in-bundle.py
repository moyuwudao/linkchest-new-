import re

with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle', 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Check for any .json references
json_refs = set()
for match in re.finditer(r'"([^"]*\.json)"', content):
    json_refs.add(match.group(1))

print("JSON file references in bundle:")
for ref in sorted(json_refs)[:30]:
    print(f"  {ref}")

print(f"\nTotal .json references: {len(json_refs)}")

# Check for any __d calls with module names
module_pattern = r'__d\([^,]+,\s*\d+,\s*\[[^\]]*\],\s*"([^"]*)"\)'
modules = re.findall(module_pattern, content)
print(f"\nTotal modules in bundle: {len(modules)}")

# Check for modules with .json
json_modules = [m for m in modules if '.json' in m]
print(f"Modules with .json: {len(json_modules)}")
for m in json_modules[:20]:
    print(f"  {m}")
