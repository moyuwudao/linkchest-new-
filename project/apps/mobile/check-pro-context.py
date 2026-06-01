f = open('/tmp/full-bundle.js').read()

# Find context around "Pro"
idx = f.find('"Pro"')
if idx >= 0:
    print('=== Context around "Pro" ===')
    print(f[max(0, idx-200):idx+200])
    print()

# Find context around "Ultimate"
idx = f.find('"Ultimate"')
if idx >= 0:
    print('=== Context around "Ultimate" ===')
    print(f[max(0, idx-200):idx+200])
    print()

# Find context around tier.pro
idx = f.find('tier.pro')
if idx >= 0:
    print('=== Context around tier.pro ===')
    print(f[max(0, idx-200):idx+200])
