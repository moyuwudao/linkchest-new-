import re

f = open('/tmp/full-bundle.js').read()

# Find the loadTranslationSync function
idx = f.find('loadTranslationSync')
if idx >= 0:
    print('=== loadTranslationSync context ===')
    print(f[max(0, idx-100):idx+500])
    print()

# Find the tier object in en.json
idx = f.find('perMonth')
if idx >= 0:
    print('=== perMonth context ===')
    print(f[max(0, idx-200):idx+200])
    print()

# Check if the en.json module is directly included
# Look for a module that contains both perMonth and tierManagement
pattern = r'\{[^}]*perMonth[^}]*tierManagement[^}]*\}'
matches = re.findall(pattern, f)
print(f'=== Found {len(matches)} potential tier objects ===')
if matches:
    print(matches[0][:300])
