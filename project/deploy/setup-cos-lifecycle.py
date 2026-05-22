#!/usr/bin/env python3
"""
⚠️ 注意：此脚本仅适用于标准对象存储 COS，不适用于轻量对象存储（Lighthouse版）
轻量对象存储不支持 put_bucket_lifecycle API（存储桶级高级功能）。

如需自动清理备份，请使用 deploy/cleanup-lhcos-backups.py（通过脚本按时间删除对象）。
"""
import os
import sys
from qcloud_cos import CosConfig, CosS3Client

def load_config():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "cos-config.env")
    config = {}
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    config[k.strip()] = v.strip()
    return config

config = load_config()

secret_id = config.get("COS_SECRET_ID")
secret_key = config.get("COS_SECRET_KEY")
bucket = config.get("COS_BUCKET")
region = config.get("COS_REGION", "ap-singapore")
prefix = config.get("COS_BACKUP_PREFIX", "db-backups/")

cos_config = CosConfig(
    Region=region,
    SecretId=secret_id,
    SecretKey=secret_key,
    Token=None,
    Scheme="https",
)
client = CosS3Client(cos_config)

lifecycle_config = {
    "Rule": [
        {
            "ID": "delete-backups-after-30-days",
            "Status": "Enabled",
            "Filter": {
                "Prefix": prefix,
            },
            "Expiration": {
                "Days": "30",
            },
        },
    ],
}

try:
    client.put_bucket_lifecycle(
        Bucket=bucket,
        LifecycleConfiguration=lifecycle_config
    )
    print(f"✅ 生命周期规则设置成功")
    print(f"   规则: 30 天后自动删除 {prefix}* 的文件")
except Exception as e:
    print(f"❌ 设置失败: {e}")
    sys.exit(1)
