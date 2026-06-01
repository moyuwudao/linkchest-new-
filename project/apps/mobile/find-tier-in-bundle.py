f = open('/tmp/full-bundle.js').read()

# Search for tier object with pro and super keys
idx = f.find('"tier":')
if idx >= 0:
    print(f'"tier" object found at: {idx}')
    print(f"\n=== tier object context ===")
    print(f[idx:idx+800])
else:
    print('"tier" object not found')

# Also search for the direct pro and super keys in en.json format
idx = f.find('"pro":"Pro"')
if idx >= 0:
    print(f"\n=== en.json pro context ===")
    print(f[max(0, idx-200):idx+200])
else:
    print('"pro":"Pro" not found')

idx = f.find('"super":"Ultimate"')
if idx >= 0:
    print(f"\n=== en.json super context ===")
    print(f[max(0, idx-200):idx+200])
else:
    print('"super":"Ultimate" not found')

# Search for zh.json format
idx = f.find('"pro":"\\u4e13\\u4e1a\\u7248"')
if idx >= 0:
    print(f"\n=== zh.json pro context ===")
    print(f[max(0, idx-200):idx+200])
else:
    print('"pro":"\\u4e13\\u4e1a\\u7248" not found')

idx = f.find('"super":"\\u65d7\\u8230\\u7248"')
if idx >= 0:
    print(f"\n=== zh.json super context ===")
    print(f[max(0, idx-200):idx+200])
else:
    print('"super":"\\u65d7\\u8230\\u7248" not found')
