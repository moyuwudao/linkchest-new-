#!/bin/bash
cd "/opt/linkchest/api/apps/web"
rm -rf .next
npx next build
pm2 restart linkchest-web