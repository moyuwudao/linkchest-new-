#!/bin/bash
cd /mnt/d/trae_projects/linkchest/project/apps/web
tar -czf /tmp/web.tar.gz .
scp /tmp/web.tar.gz ubuntu@43.136.82.88:/tmp/web.tar.gz
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/web-app/apps/web && rm -rf * && tar -xzf /tmp/web.tar.gz && rm /tmp/web.tar.gz && cd /opt/linkchest/web-app/apps/web && rm -rf .next && npm install && npx next build && pm2 restart linkchest-web"