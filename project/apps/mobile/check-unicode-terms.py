f = open('/tmp/full-bundle.js').read()

# Search for Unicode escapes of Chinese terms
print('=== 搜索 Unicode 转义形式的协议文本 ===')
print('\\u5fae\\u4fe1\\u767b\\u5f55 (微信登录):', f.count('\\u5fae\\u4fe1\\u767b\\u5f55'))
print('\\u5e94\\u7528\\u5b9d (应用宝):', f.count('\\u5e94\\u7528\\u5b9d'))
print('\\u94fe\\u85cf (链藏):', f.count('\\u94fe\\u85cf'))
print('\\u670d\\u52a1\\u6761\\u6b3e (服务条款):', f.count('\\u670d\\u52a1\\u6761\\u6b3e'))
print('\\u9690\\u79c1\\u653f\\u7b56 (隐私政策):', f.count('\\u9690\\u79c1\\u653f\\u7b56'))
print('\\u5fae\\u4fe1 (微信):', f.count('\\u5fae\\u4fe1'))

# Check for linkchest.cn and linkchest.net
print('\n=== 域名 ===')
print('linkchest.cn:', f.count('linkchest.cn'))
print('linkchest.net:', f.count('linkchest.net'))
