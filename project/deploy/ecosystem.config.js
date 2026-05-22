// ecosystem.config.js - PM2 进程管理配置
// 国内运营方案: 4核8G服务器跑应用层
// 更新时间: 2026-05-18

module.exports = {
  apps: [
    {
      name: 'linkchest-web',
      script: '/opt/linkchest/api/deploy/start-web.sh',
      interpreter: '/bin/bash',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
      max_restarts: 5,
      min_uptime: '10s',
      error_file: '/home/ubuntu/.pm2/logs/linkchest-web-error.log',
      out_file: '/home/ubuntu/.pm2/logs/linkchest-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      name: 'linkchest-api',
      script: '/opt/linkchest/api/deploy/start-api.sh',
      interpreter: '/bin/bash',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://linkchest:LinkChest_DB_2026!@114.132.81.246:5432/linkchest',
        REDIS_URL: 'redis://localhost:6379',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
      error_file: '/home/ubuntu/.pm2/logs/linkchest-api-error.log',
      out_file: '/home/ubuntu/.pm2/logs/linkchest-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};