#!/bin/bash
cd /opt/linkchest/api/project/apps/api
export $(grep -v '^#' .env | xargs)
echo "TENCENTCLOUD_SECRET_ID: $TENCENTCLOUD_SECRET_ID"
echo "SES_FROM_EMAIL: $SES_FROM_EMAIL"
