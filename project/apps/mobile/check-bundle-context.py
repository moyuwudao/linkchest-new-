import re

with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle', 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Find context around tier.pro
idx = content.find('tier.pro')
if idx >= 0:
    print("Context around 'tier.pro' (200 chars):")
    print(repr(content[max(0, idx-100):idx+100]))
    print()

# Check for other en.json content
print("Checking for en.json content:")
print(f"  'perMonth':'/mo' count: {content.count('\"perMonth\":\"/mo\"')}")
print(f"  'perYear':'/yr' count: {content.count('\"perYear\":\"/yr\"')}")
print(f"  'tierManagement':'Plan Management' count: {content.count('\"tierManagement\":\"Plan Management\"')}")
print(f"  'free':'Free' count: {content.count('\"free\":\"Free\"')}")
print(f"  'current':'Current' count: {content.count('\"current\":\"Current\"')}")
print(f"  'pro':'Pro' count: {content.count('\"pro\":\"Pro\"')}")
print(f"  'super':'Ultimate' count: {content.count('\"super\":\"Ultimate\"')}")
print(f"  'tier.pro' count: {content.count('tier.pro')}")

# Check if there's a JSON object that looks like en.json tier section
print("\nSearching for tier section pattern:")
pattern = r'"tier":\s*\{[^}]*"pro"'
matches = re.findall(pattern, content)
print(f"  Found {len(matches)} matches for tier section with 'pro'")
for m in matches[:3]:
    print(f"    {m[:100]}...")
