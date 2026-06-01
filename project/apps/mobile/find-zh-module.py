f = open('/tmp/full-bundle.js').read()

# Find the module containing zh.json content
# Look for a pattern that includes "专业版" and "旗舰版"
idx1 = f.find('专业版')
idx2 = f.find('旗舰版')

print(f"专业版 found at: {idx1}")
print(f"旗舰版 found at: {idx2}")

if idx1 >= 0:
    # Look backward to find the module start
    start = f.rfind('__d(function', max(0, idx1-2000), idx1)
    if start >= 0:
        # Look forward to find the module end
        end = f.find('},', idx1)
        if end >= 0:
            print(f"\n=== zh.json module context ===")
            print(f[start:end+100])
    else:
        # Just show context
        print(f"\n=== Context around 专业版 ===")
        print(f[max(0, idx1-200):idx1+200])
