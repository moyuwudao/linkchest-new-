f = open('/tmp/full-bundle.js').read()

# Search for zh.json tier object
# The Chinese characters will be in Unicode escape form
idx = f.find('\\u4e13\\u4e1a\\u7248')  # 专业版
if idx >= 0:
    print(f'专业版 found at: {idx}')
    print(f"Context: {f[max(0,idx-300):idx+300]}")
else:
    print('专业版 not found')

# Search for the full tier object in zh.json format
idx = f.find('perMonth:\"/\\u6708\"')
if idx >= 0:
    print(f"\nzh.json tier object found at: {idx}")
    print(f"Context: {f[max(0,idx-200):idx+500]}")
else:
    print('zh.json tier object not found')
