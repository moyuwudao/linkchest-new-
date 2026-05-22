#!/usr/bin/env python3
"""
更新 .env 文件中的 COS 密钥
用法: python3 update-cos-key.py <env文件路径>
环境变量:
  NEW_COS_SECRET_ID - 新的 COS SecretId
  NEW_COS_SECRET_KEY - 新的 COS SecretKey
"""
import os
import sys

old_secret_id = os.environ.get('OLD_COS_SECRET_ID')
old_secret_key = os.environ.get('OLD_COS_SECRET_KEY')
new_secret_id = os.environ.get('NEW_COS_SECRET_ID')
new_secret_key = os.environ.get('NEW_COS_SECRET_KEY')

if not new_secret_id or not new_secret_key:
    print("❌ 错误: 请设置环境变量 NEW_COS_SECRET_ID 和 NEW_COS_SECRET_KEY")
    print("示例:")
    print("  export NEW_COS_SECRET_ID='你的新SecretId'")
    print("  export NEW_COS_SECRET_KEY='你的新SecretKey'")
    sys.exit(1)

if not old_secret_id or not old_secret_key:
    print("⚠️ 警告: 未设置 OLD_COS_SECRET_ID 和 OLD_COS_SECRET_KEY")
    print("将尝试查找并替换文件中所有 COS_SECRET_ID/COS_SECRET_KEY 的值")

env_path = sys.argv[1] if len(sys.argv) > 1 else '/opt/linkchest/api/apps/api/.env'

with open(env_path, 'r') as f:
    content = f.read()

if old_secret_id and old_secret_key:
    content = content.replace(
        f'COS_SECRET_ID="{old_secret_id}"',
        f'COS_SECRET_ID="{new_secret_id}"'
    )
    content = content.replace(
        f'COS_SECRET_KEY="{old_secret_key}"',
        f'COS_SECRET_KEY="{new_secret_key}"'
    )
else:
    # 如果没有提供旧密钥，替换所有匹配行
    import re
    content = re.sub(
        r'COS_SECRET_ID="[^"]*"',
        f'COS_SECRET_ID="{new_secret_id}"',
        content
    )
    content = re.sub(
        r'COS_SECRET_KEY="[^"]*"',
        f'COS_SECRET_KEY="{new_secret_key}"',
        content
    )

with open(env_path, 'w') as f:
    f.write(content)

print('COS keys updated successfully')
