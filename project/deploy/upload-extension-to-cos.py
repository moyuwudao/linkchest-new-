#!/usr/bin/env python3
"""
上传 Chrome 扩展 zip 包到 COS 存储桶
用法: python3 upload-extension-to-cos.py <zip文件路径> [--china|--global]
"""

import os
import sys
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def load_env_config(env_file):
    """从 .env 文件加载配置"""
    config = {}
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    config[k.strip()] = v.strip().strip('"').strip("'")
    return config

def upload_extension(file_path, config, cos_key):
    """上传文件到 COS"""
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError:
        logger.error("缺少 cos-python-sdk-v5，请执行: pip3 install cos-python-sdk-v5")
        return False

    secret_id = config.get("COS_SECRET_ID")
    secret_key = config.get("COS_SECRET_KEY")
    bucket = config.get("COS_BUCKET")
    region = config.get("COS_REGION", "ap-singapore")

    if not all([secret_id, secret_key, bucket]):
        logger.error("COS 配置不完整，请检查 .env 文件中的 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET")
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

        logger.info(f"开始上传 {file_path} 到 COS: {bucket}/{cos_key}")

        client.upload_file(
            Bucket=bucket,
            Key=cos_key,
            LocalFilePath=file_path,
            EnableMD5=False,
        )

        # 生成访问 URL
        domain = config.get("COS_DOMAIN", f"{bucket}.cos.{region}.myqcloud.com")
        url = f"https://{domain}/{cos_key}"

        logger.info(f"✅ 上传成功!")
        logger.info(f"📦 COS Key: {cos_key}")
        logger.info(f"🔗 访问 URL: {url}")
        logger.info(f"\n请将此 URL 更新到页面代码中的 directDownloadUrl 变量")

        return True

    except Exception as e:
        logger.error(f"COS 上传失败: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="上传 Chrome 扩展 zip 包到 COS")
    parser.add_argument("file_path", help="zip 文件路径")
    parser.add_argument("--china", action="store_true", help="上传到国内存储桶")
    parser.add_argument("--global", action="store_true", help="上传到海外存储桶")
    parser.add_argument("--env", default=".env", help="环境变量文件路径")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        logger.error(f"文件不存在: {args.file_path}")
        sys.exit(1)

    # 加载配置
    config = load_env_config(args.env)

    # 确定 COS Key
    file_name = os.path.basename(args.file_path)
    cos_key = f"extensions/{file_name}"

    # 上传
    success = upload_extension(args.file_path, config, cos_key)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
