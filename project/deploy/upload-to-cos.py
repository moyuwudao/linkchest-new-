#!/usr/bin/env python3
import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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

def upload_file(file_path, config):
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError:
        logger.error("缺少 cos-python-sdk-v5，请执行: python3 -m pip install cos-python-sdk-v5 --break-system-packages")
        return False

    secret_id = config.get("COS_SECRET_ID")
    secret_key = config.get("COS_SECRET_KEY")
    bucket = config.get("COS_BUCKET")
    region = config.get("COS_REGION", "ap-guangzhou")
    prefix = config.get("COS_BACKUP_PREFIX", "backups/")

    if not all([secret_id, secret_key, bucket]):
        logger.error("COS 配置不完整，请检查 deploy/cos-config.env")
        return False

    try:
        cos_config = CosConfig(
            Region=region,
            SecretId=secret_id,
            SecretKey=secret_key,
            Token=None,
            Scheme="https",
        )
        client = CosS3Client(cos_config)

        file_name = os.path.basename(file_path)
        cos_key = f"{prefix}{file_name}"

        logger.info(f"开始上传 {file_path} 到 COS: {bucket}/{cos_key}")

        client.upload_file(
            Bucket=bucket,
            Key=cos_key,
            LocalFilePath=file_path,
            EnableMD5=False,
        )

        logger.info(f"COS 上传成功: {cos_key}")
        return True

    except Exception as e:
        logger.error(f"COS 上传失败: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: upload-to-cos.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        logger.error(f"文件不存在: {file_path}")
        sys.exit(1)

    config = load_config()
    success = upload_file(file_path, config)
    sys.exit(0 if success else 1)
