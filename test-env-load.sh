#!/bin/bash
cd /opt/linkchest/api/project/apps/api

# 加载环境变量
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  export "$line"
done < .env

echo "TENCENTCLOUD_SECRET_ID: $TENCENTCLOUD_SECRET_ID"
echo "SES_FROM_EMAIL: $SES_FROM_EMAIL"
echo "MARKET: $MARKET"
