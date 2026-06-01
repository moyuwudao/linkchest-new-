import re

f = open('/tmp/full-bundle.js').read()

# Find the module containing the en.json content
# Look for a pattern that includes "tier" with "perMonth" or "tierManagement"
pattern = r'"tier":\{[^}]*"perMonth"'
matches = re.findall(pattern, f)
print('tier object matches:', len(matches))

if matches:
    print('First match:', matches[0][:200])

# More comprehensive search - find the full tier object
idx = f.find('"perMonth"')
if idx >= 0:
    # Look backward to find the start of the tier object
    start = f.rfind('"tier":', max(0, idx-500), idx)
    if start >= 0:
        # Look forward to find the end of the tier object
        end = f.find('}', idx)
        if end >= 0:
            print('\nFull tier object:')
            print(f[start:end+1])

# Check for pro key specifically
print('\n"pro":"Pro" count:', f.count('"pro":"Pro"'))
print('"super":"Ultimate" count:', f.count('"super":"Ultimate"'))

# Find context around pro
idx = f.find('"pro":"Pro"')
if idx >= 0:
    print('\nContext around pro:')
    print(f[max(0, idx-100):idx+100])
