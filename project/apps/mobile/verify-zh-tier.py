import os
import json

# Read zh.json
with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/zh.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)

print("=== zh.json tier 对象 ===")
print(json.dumps(zh.get('tier', {}), ensure_ascii=False, indent=2))

# Read en.json
with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

print("\n=== en.json tier 对象 ===")
print(json.dumps(en.get('tier', {}), ensure_ascii=False, indent=2))

# Check for the specific keys
print("\n=== 检查特定键 ===")
print("tier.pro in zh:", zh.get('tier', {}).get('pro'))
print("tier.super in zh:", zh.get('tier', {}).get('super'))
print("tier.pro in en:", en.get('tier', {}).get('pro'))
print("tier.super in en:", en.get('tier', {}).get('super'))
