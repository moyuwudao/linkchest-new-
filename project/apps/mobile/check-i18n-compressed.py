f = open('/tmp/full-bundle.js').read()

# Search for patterns that look like the i18n module
# Look for flatten function or require('./locales/')
print('=== 搜索 i18n 相关模式 ===')
print("require('./locales/):", f.count("require('./locales/"))
print("require(\",\"./locales/):", f.count('require("./locales/'))

# Find all occurrences of 'locales' in the bundle
indices = [i for i in range(len(f)) if f.startswith('locales', i)]
print(f"\n'locales' 出现 {len(indices)} 次")

# Look for the switch-like pattern for locale loading
# After minification, switch might be converted to if-else or object lookup
print('\n=== 搜索 locale 判断逻辑 ===')
print("'zh':", f.count("'zh'"))
print('"zh":', f.count('"zh"'))
print("'en':", f.count("'en'"))
print('"en":', f.count('"en"'))

# Search for the TranslationMap or i18n context
print('\n=== 搜索 i18n Context ===')
print('I18nContext:', f.count('I18nContext'))
print('createContext:', f.count('createContext'))
print('useI18n:', f.count('useI18n'))
