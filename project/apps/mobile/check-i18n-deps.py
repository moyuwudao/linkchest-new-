import re

with open('/tmp/test-bundle.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the i18n.tsx module
# Metro modules look like: __d(function(g,r,i,a,m,e,d){...}, moduleId, [deps], "moduleName");
pattern = r'__d\((function\(g,r,i,a,m,e,d\)\{.*?\}),\s*(\d+),\s*(\[[^\]]*\]),\s*"([^"]*i18n[^"]*)"\)'
matches = re.findall(pattern, content, re.DOTALL)

print(f"Found {len(matches)} i18n modules")

for func, module_id, deps, name in matches:
    print(f"\nModule: {name}")
    print(f"  ID: {module_id}")
    print(f"  Deps: {deps}")
    # Check if the function body contains require('./locales')
    if 'locales' in func:
        print(f"  Contains 'locales': YES")
    else:
        print(f"  Contains 'locales': NO")

# Also search for any module with 'locales' in the name
all_modules = re.findall(r'__d\((function\(g,r,i,a,m,e,d\)\{.*?\}),\s*(\d+),\s*(\[[^\]]*\]),\s*"([^"]*)"\)', content, re.DOTALL)
locale_modules = [(func, mid, deps, name) for func, mid, deps, name in all_modules if 'locales' in name]
print(f"\n\nTotal modules with 'locales' in name: {len(locale_modules)}")
for func, mid, deps, name in locale_modules:
    print(f"  {name} (ID: {mid})")

# Search for any require call with locales in ANY module
all_modules = re.findall(r'__d\((function\(g,r,i,a,m,e,d\)\{.*?\}),\s*(\d+),\s*(\[[^\]]*\]),\s*"([^"]*)"\)', content, re.DOTALL)
modules_with_locales_req = []
for func, mid, deps, name in all_modules:
    if 'require' in func and 'locales' in func:
        modules_with_locales_req.append((name, mid))

print(f"\nModules with require('...locales...'): {len(modules_with_locales_req)}")
for name, mid in modules_with_locales_req[:10]:
    print(f"  {name} (ID: {mid})")
