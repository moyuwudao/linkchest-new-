f = open('/tmp/full-bundle.js').read()

# Find context around Google Sign-In
idx = f.find('Google Sign-In')
if idx >= 0:
    print('=== Context around Google Sign-In ===')
    print(f[max(0, idx-200):idx+200])
    print()

# Find context around # LinkChest
idx = f.find('# LinkChest')
if idx >= 0:
    print('=== Context around # LinkChest ===')
    print(f[max(0, idx-200):idx+200])
