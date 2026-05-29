#!/bin/bash
cd /opt/linkchest/api/project/apps/api

# 加载环境变量
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  export "$line"
done < .env

# 测试邮件发送
node -e "
const { sendVerificationCode } = require('./dist/services/ses.js');
sendVerificationCode('test@example.com', '123456')
  .then(r => console.log('Success:', JSON.stringify(r)))
  .catch(e => console.error('Error:', e.message));
"
