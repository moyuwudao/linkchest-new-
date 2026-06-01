f = open('/tmp/full-bundle.js').read()

print('=== 搜索 zh.json 特有内容 ===')
print('专业版:', f.count('专业版'))
print('旗舰版:', f.count('旗舰版'))
print('/月:', f.count('/月'))
print('/年:', f.count('/年'))
print('等级管理:', f.count('等级管理'))

# Check for Unicode escapes
print('\n=== 搜索 Unicode 转义 ===')
print('\\u4e13\\u4e1a\\u7248 (专业版):', f.count('\\u4e13\\u4e1a\\u7248'))
print('\\u65d7\\u8230\\u7248 (旗舰版):', f.count('\\u65d7\\u8230\\u7248'))
print('\\u6708 (月):', f.count('\\u6708'))
print('\\u5e74 (年):', f.count('\\u5e74'))

# Search for "pro" with Chinese value
idx = f.find('专业版')
if idx >= 0:
    print('\n=== 专业版 context ===')
    print(f[max(0, idx-100):idx+100])
else:
    print('\n专业版 NOT FOUND')
