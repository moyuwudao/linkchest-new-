#!/bin/bash
echo "=== API tier 实际数据 (v4.1) ==="
curl -s https://linkchest.cn/api/tiers/ | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
for t in d:
    name_zh = t['nameZh']
    name_en = t['nameEn']
    pricing = t.get('pricing') or {}
    yearly = pricing.get('yearly') or {}
    monthly = pricing.get('monthly')  # 应该是 None
    year_str = f\"{yearly.get('cny', 0)/100:.0f}元/{yearly.get('usd', 0)/100:.2f}美元\" if yearly else '免费'
    mon_str = '有' if monthly else '无'
    print(f\"  {t['key']:8s} {name_zh}/{name_en}: yearly={year_str}  monthly={mon_str}\")
    print(f\"    limits keys: {sorted(t.get('limits', {}).keys())}\")
"
