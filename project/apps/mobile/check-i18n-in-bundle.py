import re

with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle', 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Search for i18n.tsx content
print("Searching for i18n.tsx content in bundle:")
search_terms = [
    'loadTranslationSync',
    'flatten',
    'getCachedTranslation',
    'I18nProvider',
    'useI18n',
    'linkchest-locale',
    'isChinaMarket',
    'detectSystemLocale',
]

for term in search_terms:
    count = content.count(term)
    print(f"  {term}: {count}")

# Search for require statements related to locales
print("\nSearching for require('./locales'):")
matches = re.findall(r"require\(['\"]([^'\"]*locales[^'\"]*)['\"]\)", content)
for m in matches:
    print(f"  {m}")

# Search for any require with .json
print("\nSearching for require with .json:")
matches = re.findall(r"require\(['\"]([^'\"]*\.json)['\"]\)", content)
for m in set(matches):
    print(f"  {m}")
