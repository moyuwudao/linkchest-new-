f = open('/tmp/full-bundle.js').read()

# Find using Unicode escapes
idx1 = f.find('\\u4e13\\u4e1a\\u7248')  # 专业版
idx2 = f.find('\\u65d7\\u8230\\u7248')  # 旗舰版

print(f"专业版 (\\u4e13\\u4e1a\\u7248) found at: {idx1}")
print(f"旗舰版 (\\u65d7\\u8230\\u7248) found at: {idx2}")

if idx1 >= 0:
    print(f"\n=== Context around 专业版 ===")
    print(f[max(0, idx1-200):idx1+200])
