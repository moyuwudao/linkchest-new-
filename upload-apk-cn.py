#!/usr/bin/env python3
"""上传 APK 到腾讯云 COS 国内 CDN。"""
import os
import sys
import re

# 加载 COS 配置
env_file = '/tmp/.env.cn'
cos_config = {}
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            m = re.match(r'(COS_\w+)\s*=\s*(\S+)', line)
            if m:
                cos_config[m.group(1)] = m.group(2)
else:
    print(f'Missing env file: {env_file}', file=sys.stderr)
    sys.exit(1)

required = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION']
if not all(k in cos_config for k in required):
    print(f'Missing keys: {set(required) - set(cos_config.keys())}', file=sys.stderr)
    sys.exit(1)

try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print('Missing cos-python-sdk-v5', file=sys.stderr)
    sys.exit(1)

config = CosConfig(
    Region=cos_config['COS_REGION'],
    SecretId=cos_config['COS_SECRET_ID'],
    SecretKey=cos_config['COS_SECRET_KEY'],
    Scheme='https',
)
client = CosS3Client(config)

src = '/tmp/LinkChest.apk'
key = 'downloads/LinkChest.apk'
bucket = cos_config['COS_BUCKET']

print(f'Uploading {src} ({os.path.getsize(src)} bytes) to cos://{bucket}/{key} ...')

response = client.put_object(
    Bucket=bucket,
    Key=key,
    Body=open(src, 'rb'),
    ACL='public-read',
    ContentType='application/vnd.android.package-archive',
    CacheControl='public, max-age=86400',
)
print(f'put_object OK: {response.get("ETag", "")}')

# 重新设置 ACL（确保 public-read）
client.put_object_acl(Bucket=bucket, Key=key, ACL='public-read')

host = f"https://{bucket}.cos.{cos_config['COS_REGION']}.myqcloud.com"
url = f"{host}/{key}"
print(f'URL: {url}')

# 测试访问
import urllib.request
try:
    req = urllib.request.Request(url, method='HEAD')
    with urllib.request.urlopen(req, timeout=15) as r:
        print(f'HEAD OK: HTTP {r.status}, Content-Length: {r.headers.get("Content-Length")}')
except Exception as e:
    print(f'Access test failed: {e}', file=sys.stderr)
