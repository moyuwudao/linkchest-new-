#!/bin/bash
# 在国内服务器上跑 Puppeteer 测试小红书
ssh linkchest-cn-app 'cd /opt/linkchest/api/project/apps/api && NODE_PATH=/opt/linkchest/api/project/node_modules timeout 60 npx tsx src/test-xhs-cookie.ts 2>&1'
