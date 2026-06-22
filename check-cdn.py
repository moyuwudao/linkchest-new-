#!/usr/bin/env python3
"""检查腾讯云 CDN 配置."""
import os
import sys
import re

env_file = '/tmp/.env.cn'
cos_config = {}
with open(env_file) as f:
    for line in f:
        line = line.strip()
        m = re.match(r'(COS_\w+|TENCENT_CLOUD_\w+)\s*=\s*(\S+)', line)
        if m:
            cos_config[m.group(1)] = m.group(2)

print('Config keys:', list(cos_config.keys()))

try:
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.cdn.v20180606 import cdn_client, models
except ImportError as e:
    print(f'Missing SDK: {e}')
    sys.exit(1)

cred = credential.Credential(
    cos_config.get('TENCENT_CLOUD_SECRET_ID', cos_config.get('COS_SECRET_ID')),
    cos_config.get('TENCENT_CLOUD_SECRET_KEY', cos_config.get('COS_SECRET_KEY')),
)

http_profile = HttpProfile()
http_profile.endpoint = 'cdn.tencentcloudapi.com'
client_profile = ClientProfile()
client_profile.httpProfile = http_profile
client = cdn_client.CdnClient(cred, '', client_profile)

# 查询域名
req = models.DescribeDomainsRequest()
req.Filters = [{'Name': 'domain', 'Value': 'linkchest.cn'}]
try:
    resp = client.DescribeDomains(req)
    print('Domains:', [d.Domain for d in resp.Domains])
except Exception as e:
    print(f'Error: {e}')

# 查询 linkchest.cn 详细配置
req = models.DescribeCdnDomainRequest()
req.Domain = 'linkchest.cn'
try:
    resp = client.DescribeCdnDomain(req)
    print(f'\n--- linkchest.cn ---')
    print(f'Status: {resp.Status}')
    print(f'Origin: {resp.Origin.Origins if resp.Origin else "N/A"}')
    print(f'Https: {resp.Https}')
except Exception as e:
    print(f'Error: {e}')
