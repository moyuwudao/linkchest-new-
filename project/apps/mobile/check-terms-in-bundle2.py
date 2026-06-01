f = open('/tmp/full-bundle.js').read()

print('=== 更广泛的协议文本搜索 ===')
print('服务条款:', f.count('服务条款'))
print('隐私政策:', f.count('隐私政策'))
print('Terms of Service:', f.count('Terms of Service'))
print('Privacy Policy:', f.count('Privacy Policy'))
print('Google Sign-In:', f.count('Google Sign-In'))
print('Google 登录:', f.count('Google 登录'))
print('WeChat:', f.count('WeChat'))
print('# 链藏:', f.count('# 链藏'))
print('# LinkChest:', f.count('# LinkChest'))

# Check if the JSON file module is included at all
print('\n=== 检查 JSON 模块标识 ===')
print('termsContent:', f.count('termsContent'))
print('privacyContent:', f.count('privacyContent'))
