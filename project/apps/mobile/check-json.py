import json

with open('/mnt/d/trae_projects/linkchest/project/apps/mobile/src/lib/locales/en.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print("tier section:")
print(json.dumps(d.get('tier', {}), ensure_ascii=False, indent=2))
