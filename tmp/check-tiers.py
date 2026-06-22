import json, sys, urllib.request

data = json.loads(urllib.request.urlopen('https://linkchest.cn/api/tiers').read())
for t in data['data']:
    print(t['key'], '->', json.dumps(t.get('pricing'), ensure_ascii=False))
