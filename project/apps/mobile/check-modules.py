import re

with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle', 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Metro bundles modules like: __d(function(g,r,i,a,m,e,d){...}, moduleId, [deps], "moduleName");
# Let's search for module names containing "locales"
pattern = r'__d\([^,]+,\s*\d+,\s*\[[^\]]*\],\s*"([^"]*locales[^"]*)"\)'
matches = re.findall(pattern, content)

print("Modules containing 'locales' in name:")
for m in matches:
    print(f"  {m}")

if not matches:
    # Try simpler search for any string containing "locales" in the bundle
    print("No modules found with regex. Searching for 'locales' strings...")
    locale_strings = set()
    for match in re.finditer(r'"([^"]*locales[^"]*)"', content):
        locale_strings.add(match.group(1))
    for s in sorted(locale_strings):
        print(f"  {s}")

# Also check for zh.json, ja.json, ko.json etc.
print("\nChecking for specific locale files:")
for locale in ['en.json', 'zh.json', 'ja.json', 'ko.json', 'fr.json', 'de.json']:
    count = content.count(locale)
    print(f"  {locale}: {count}")
