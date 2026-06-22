#!/usr/bin/env python3
"""上传 APK 到腾讯云 COS 国内 CDN."""
import sys
import os
import re

# 从 .env 文件读取 COS 配置
env_file = '/opt/linkchest/api/.env'
cos_config = {}
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            m = re.match(r'COS_(SECRET_ID|SECRET_KEY|BUCKET|REGION)\s*=\s*"?([^"]+)"?', line)
            if m:
                cos_config[m.group(1)] = m.group(2)

required = ['SECRET_ID', 'SECRET_KEY', 'BUCKET', 'REGION']
if not all(k in cos_config for k in required):
    print(f'Missing COS config in {env_file}', file=sys.stderr)
    print(f'Found: {list(cos_config.keys())}', file=sys.stderr)
    sys.exit(1)

from qcloud_cos import CosConfig, CosS3Client

config = CosConfig(
    Region=cos_config['REGION'],
    SecretId=cos_config['SECRET_ID'],
    SecretKey=cos_config['SECRET_KEY'],
    Scheme='https',
)
client = CosS3Client(config)

src = '/tmp/LinkChest.apk'
key = 'downloads/LinkChest.apk'
bucket = cos_config['BUCKET']

print(f'Uploading {src} to cos://{bucket}/{key} ...')

# 上传
with open(src, 'rb') as f:
    response = client.put_object(
        Bucket=bucket,
        Body=f,
        Key=key,
        # 设置公共读
        ACL='public-read',
        # 设置下载 mime
        ContentType='application/vnd.android.package-archive',
        # 缓存 1 天
        CacheControl='public, max-age=86400',
    )

# 确认 ACL 设置
print('Setting public-read ACL...')
client.put_object_acl(Bucket=bucket, Key=key, ACL='public-read')

# 输出下载 URL
host = f"https://{bucket}.cos.{cos_config['REGION']}.myqcloud.com"
url = f"{host}/{key}"
print(f'OK: {url}')

# 测试访问
import urllib.request
try:
    req = urllib.request.urlopen(url, timeout=10)
    print(f'HTTP: {req.status}, Content-Length: {req.headers.get("Content-Length")}')
except Exception as e:
    print(f'Access test failed: {e}', file=sys.stderr)
