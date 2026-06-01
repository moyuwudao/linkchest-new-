f = open('/tmp/full-bundle.js').read()

# Find context around "Pro"
idx = f.find('"Pro"')
if idx >= 0:
    print(f'"Pro" found at: {idx}')
    print(f"Context: {f[max(0,idx-200):idx+200]}")
else:
    print('"Pro" not found')

# Find context around "Ultimate"
idx = f.find('"Ultimate"')
if idx >= 0:
    print(f'\n"Ultimate" found at: {idx}')
    print(f"Context: {f[max(0,idx-200):idx+200]}")
else:
    print('"Ultimate" not found')

# Find context around "/mo"
idx = f.find('"/mo"')
if idx >= 0:
    print(f'\n"/mo" found at: {idx}')
    print(f"Context: {f[max(0,idx-200):idx+200]}")
else:
    print('"/mo" not found')
