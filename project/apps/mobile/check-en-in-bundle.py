f = open('/tmp/full-bundle.js').read()

# Search for en.json specific strings
print('=== 搜索 en.json 特有内容 ===')
print('/mo:', f.count('/mo'))
print('Plan Management:', f.count('Plan Management'))
print('Not Subscribed:', f.count('Not Subscribed'))
print('/yr:', f.count('/yr'))
print('/quarter:', f.count('/quarter'))

# Search for both zh and en tier content
print('\n=== 搜索 tier 相关内容 ===')
print('/月:', f.count('/\u6708'))
print('/年:', f.count('/\u5e74'))
print('等级管理:', f.count('\u7b49\u7ea7\u7ba1\u7406'))

# Find the full tier object from zh.json
idx = f.find('/\u6708')
if idx >= 0:
    print('\n=== /月 context ===')
    print(f[max(0, idx-300):idx+100])
