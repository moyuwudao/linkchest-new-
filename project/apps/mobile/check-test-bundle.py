with open('/tmp/test-bundle.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

print(f"Bundle size: {len(content)} bytes")

print("\nChecking for en.json content:")
print(f"  'pro':'Pro' count: {content.count('\"pro\":\"Pro\"')}")
print(f"  'super':'Ultimate' count: {content.count('\"super\":\"Ultimate\"')}")
print(f"  'perMonth':'/mo' count: {content.count('\"perMonth\":\"/mo\"')}")

print("\nChecking for locales references:")
print(f"  'locales' count: {content.count('locales')}")
print(f"  'en.json' count: {content.count('en.json')}")
print(f"  'zh.json' count: {content.count('zh.json')}")

print("\nChecking for module registration:")
print(f"  '__d(' count: {content.count('__d(')}")

# Check for specific module names
import re
modules = re.findall(r'__d\([^,]+,\s*\d+,\s*\[[^\]]*\],\s*"([^"]*)"\)', content)
json_modules = [m for m in modules if '.json' in m]
print(f"\nJSON modules: {len(json_modules)}")
for m in json_modules[:10]:
    print(f"  {m}")

# Check for any require with locales
requires = re.findall(r"require\(['\"]([^'\"]*locales[^'\"]*)['\"]\)", content)
print(f"\nRequires with 'locales': {len(requires)}")
for r in requires[:10]:
    print(f"  {r}")
