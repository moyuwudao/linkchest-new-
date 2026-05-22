#!/usr/bin/env python3
"""
轻量对象存储（Lighthouse版）备份清理脚本
替代原 COS 生命周期规则（put_bucket_lifecycle 在轻量对象存储中不支持）

用法: python3 deploy/cleanup-lhcos-backups.py [保留天数，默认30]
功能: 删除指定桶中 backups/ 前缀下超过保留天数的对象
"""
import os
import sys
import logging
from datetime import datetime, timezone, timedelta
from qcloud_cos import CosConfig, CosS3Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def load_config():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "cos-config.env")
    config = {}
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    config[k.strip()] = v.strip()
    return config


def main():
    keep_days = int(sys.argv[1]) if len(sys.argv) > 1 else 30

    config = load_config()
    secret_id = config.get("COS_SECRET_ID") or os.environ.get("COS_SECRET_ID")
    secret_key = config.get("COS_SECRET_KEY") or os.environ.get("COS_SECRET_KEY")
    bucket = config.get("COS_BUCKET") or os.environ.get("COS_BUCKET")
    region = config.get("COS_REGION") or os.environ.get("COS_REGION", "ap-singapore")
    prefix = config.get("COS_BACKUP_PREFIX") or os.environ.get("COS_BACKUP_PREFIX", "backups/")

    if not all([secret_id, secret_key, bucket]):
        logger.error("配置不完整，请检查 deploy/cos-config.env")
        sys.exit(1)

    cos_config = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Token=None, Scheme="https")
    client = CosS3Client(cos_config)

    cutoff = datetime.now(timezone.utc) - timedelta(days=keep_days)
    logger.info(f"清理阈值: {cutoff.isoformat()} (保留 {keep_days} 天)")
    logger.info(f"扫描前缀: {prefix}")

    deleted = 0
    failed = 0
    marker = ""

    while True:
        resp = client.list_objects(Bucket=bucket, Prefix=prefix, Marker=marker, MaxKeys=1000)
        contents = resp.get("Contents", [])

        for obj in contents:
            key = obj["Key"]
            last_mod = obj["LastModified"]
            # COS SDK 返回的 LastModified 可能是字符串，需解析
            if isinstance(last_mod, str):
                last_mod = datetime.fromisoformat(last_mod.replace("Z", "+00:00"))

            if last_mod < cutoff:
                try:
                    client.delete_object(Bucket=bucket, Key=key)
                    logger.info(f"  🗑️ 已删除: {key} (创建于 {last_mod.isoformat()})")
                    deleted += 1
                except Exception as e:
                    logger.error(f"  ❌ 删除失败 {key}: {e}")
                    failed += 1

        if resp.get("IsTruncated") == "true":
            marker = resp.get("NextMarker", "")
        else:
            break

    logger.info(f"清理完成: 删除 {deleted} 个, 失败 {failed} 个")


if __name__ == "__main__":
    main()
