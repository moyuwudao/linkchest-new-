#!/bin/bash
# 启动WEB服务

cd /opt/linkchest/web-app/apps/web

# 创建PM2配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'linkchest-web',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/opt/linkchest/web-app/apps/web',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      NEXT_PUBLIC_API_URL: 'http://43.136.82.88:3001/api'
    },
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/.pm2/logs/linkchest-web-error.log',
    out_file: '/home/ubuntu/.pm2/logs/linkchest-web-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# 启动服务
pm2 delete linkchest-web 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo 'WEB服务启动完成'
pm2 status
