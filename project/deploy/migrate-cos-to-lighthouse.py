#!/usr/bin/env python3
"""
COS → 轻量对象存储（Lighthouse版）数据迁移脚本
用法: python3 deploy/migrate-cos-to-lighthouse.py

功能: 将现有COS桶中的所有对象迁移到轻量对象存储桶。
注意: 轻量对象存储兼容COS SDK，但 StorageClass 必须为 DEFAULT 或不设置。
"""
import os
import sys
import logging
from datetime import datetime, timezone
from qcloud_cos import CosConfig, CosS3Client
from qcloud_cos.cos_exception import CosServiceError

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def load_config():
    """加载同目录下的 cos-config.env"""
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


def get_client(secret_id, secret_key, region):
    config = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Token=None, Scheme="https")
    return CosS3Client(config)


def list_all_objects(client, bucket, prefix=""):
    """分页列出桶内所有对象，返回 [(key, size, last_modified), ...]"""
    objects = []
    marker = ""
    while True:
        resp = client.list_objects(Bucket=bucket, Prefix=prefix, Marker=marker, MaxKeys=1000)
        if "Contents" in resp:
            for obj in resp["Contents"]:
                objects.append((obj["Key"], int(obj["Size"]), obj["LastModified"]))
        if resp.get("IsTruncated") == "true":
            marker = resp.get("NextMarker", "")
        else:
            break
    return objects


def migrate_object(src_client, dst_client, src_bucket, dst_bucket, key, region):
    """单对象迁移：下载后上传（轻量对象存储不支持跨区域复制API）"""
    try:
        # 下载对象到内存
        resp = src_client.get_object(Bucket=src_bucket, Key=key)
        body = resp["Body"].get_raw_stream().read()

        # 上传到目标桶（轻量COS：不设置 StorageClass，或设为 DEFAULT）
        dst_client.put_object(
            Bucket=dst_bucket,
            Key=key,
            Body=body,
            # 不设置 StorageClass，让服务端自动使用 DEFAULT
        )
        return True
    except Exception as e:
        logger.error(f"  ❌ 迁移失败 {key}: {e}")
        return False


def main():
    config = load_config()

    # 源桶配置（现有COS）
    src_secret_id = config.get("COS_SECRET_ID") or os.environ.get("COS_SECRET_ID")
    src_secret_key = config.get("COS_SECRET_KEY") or os.environ.get("COS_SECRET_KEY")
    src_bucket = config.get("COS_BUCKET") or os.environ.get("COS_BUCKET")
    region = config.get("COS_REGION") or os.environ.get("COS_REGION", "ap-singapore")

    # 目标桶配置（轻量对象存储）
    dst_bucket = os.environ.get("LH_COS_BUCKET")
    if not dst_bucket:
        dst_bucket = input("请输入轻量对象存储桶名（如 lhcos-xxxxx-xxxxxxxx）: ").strip()

    if not all([src_secret_id, src_secret_key, src_bucket, dst_bucket]):
        logger.error("配置不完整。请检查 cos-config.env 或环境变量: COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, LH_COS_BUCKET")
        sys.exit(1)

    logger.info(f"源桶: {src_bucket} (区域: {region})")
    logger.info(f"目标桶: {dst_bucket} (区域: {region})")

    src_client = get_client(src_secret_id, src_secret_key, region)
    dst_client = get_client(src_secret_id, src_secret_key, region)  # 密钥相同

    # 列出源桶对象
    logger.info("正在列出源桶对象...")
    objects = list_all_objects(src_client, src_bucket)
    logger.info(f"共发现 {len(objects)} 个对象")

    if not objects:
        logger.info("源桶为空，无需迁移")
        return

    # 确认
    total_size = sum(o[1] for o in objects)
    logger.info(f"总大小: {total_size / 1024 / 1024:.2f} MB")
    confirm = input(f"确认开始迁移? [y/N]: ").strip().lower()
    if confirm != "y":
        logger.info("已取消")
        return

    # 执行迁移
    success = 0
    failed = 0
    skipped = 0

    for i, (key, size, last_mod) in enumerate(objects, 1):
        # 跳过文件夹占位对象（大小为0且以/结尾）
        if size == 0 and key.endswith("/"):
            skipped += 1
            continue

        logger.info(f"[{i}/{len(objects)}] 迁移: {key} ({size / 1024:.1f} KB)")
        if migrate_object(src_client, dst_client, src_bucket, dst_bucket, key, region):
            success += 1
        else:
            failed += 1

    logger.info("=" * 50)
    logger.info(f"迁移完成: 成功 {success}, 失败 {failed}, 跳过 {skipped}")
    if failed > 0:
        logger.warning("存在失败的迁移，请检查日志后重新运行脚本（已成功的会覆盖上传）")


if __name__ == "__main__":
    main()
