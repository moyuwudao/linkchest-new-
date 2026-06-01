f = open('/tmp/full-bundle.js').read()

# Search for all occurrences of "pro" and "super" near "tier"
print("=== Search for tier.pro ===")
idx = f.find('tier.pro')
print(f"tier.pro found: {idx >= 0}")
if idx >= 0:
    print(f"Context: ...{f[max(0,idx-50):idx+50]}...")

print("\n=== Search for tier.super ===")
idx = f.find('tier.super')
print(f"tier.super found: {idx >= 0}")
if idx >= 0:
    print(f"Context: ...{f[max(0,idx-50):idx+50]}...")

print("\n=== Search for 't.pro' ===")
idx = f.find('"t.pro"')
print(f'"t.pro" found: {idx >= 0}')

print("\n=== Search for 't.super' ===")
idx = f.find('"t.super"')
print(f'"t.super" found: {idx >= 0}')

# Search for "pro" as a key
print("\n=== Search for 'pro:' ===")
idx = f.find('"pro":')
if idx >= 0:
    print(f'"pro": found at {idx}')
    print(f"Context: {f[max(0,idx-100):idx+100]}")
else:
    print('"pro": not found')

# Search for 'tier:' object key
print("\n=== Search for 'tier:' (object key) ===")
idx = f.find('"tier":')
if idx >= 0:
    print(f'"tier": found at {idx}')
    print(f"Context: {f[max(0,idx-100):idx+200]}")
else:
    print('"tier": not found')
