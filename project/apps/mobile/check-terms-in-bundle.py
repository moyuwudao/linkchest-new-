f = open('/tmp/full-bundle.js').read()

print('=== 检查协议文本内容 ===')
print('微信登录:', f.count('微信登录'))
print('应用宝:', f.count('应用宝'))
print('linkchest.cn:', f.count('linkchest.cn'))
print('linkchest.net:', f.count('linkchest.net'))
print('terms-content:', f.count('terms-content'))
print('privacy-content:', f.count('privacy-content'))

# Check for the existence of terms JSON module
idx = f.find('链藏服务条款')
if idx >= 0:
    print('\n链藏服务条款 FOUND at', idx)
else:
    print('\n链藏服务条款 NOT FOUND')
