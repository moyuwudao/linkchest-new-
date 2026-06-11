// ecosystem.config.js - PM2 进程管理配置
// 国内/海外差异化配置：通过 process.env.MARKET 区分（china/global）
// 更新时间: 2026-06-05
//
// 海外应用层 (雅加达 43.157.240.68): 2核2G → API heap 512MB / Web heap 384MB
//                                  → API 阈值 1G / Web 阈值 800M
//                                  → 单实例 fork 模式（资源紧张）
// 国内应用层 (43.136.82.88):         4核7.6G → API heap 1024MB / Web heap 512MB
//                                  → API 阈值 1536M / Web 阈值 1024M
//                                  → 2 实例 cluster 模式（充分利用多核）
// PM2 max_memory_restart 不支持小数（1.5G），必须用整数 MB/KB/GB

const market = process.env.MARKET || 'china'
const isCN = market === 'china'

// 国内应用层内存受限 (2核2G)，需严格控制 Node 堆内存 + 单实例 fork
// 国内应用层资源充裕 (4核7.6G)，Puppeteer 浏览器池需要较多内存，改为 1 实例 fork 模式
// 海外应用层同上，单实例 fork
const cfg = isCN
  ? { apiMem: '1536M', webMem: '1024M', apiHeap: 1024, webHeap: 512, apiInstances: 1, apiExecMode: 'fork' }
  : { apiMem: '1024M', webMem: '800M', apiHeap: 512, webHeap: 384, apiInstances: 1, apiExecMode: 'fork' }

const apiApp = {
  name: 'linkchest-api',
  // 统一使用 fork 模式 + bash 启动脚本（Puppeteer 浏览器池需要单进程管理）
  script: '/opt/linkchest/api/project/deploy/start-api.sh',
  interpreter: '/bin/bash',
  cwd: '/opt/linkchest/api/project/apps/api',
  instances: cfg.apiInstances,
  exec_mode: cfg.apiExecMode,
  autorestart: true,
  watch: false,
  max_memory_restart: cfg.apiMem,
  env: {
    NODE_ENV: 'production',
    MARKET: market,
    NODE_OPTIONS: `--max-old-space-size=${cfg.apiHeap}`,
    PUPPETEER_EXECUTABLE_PATH: '/usr/bin/google-chrome-stable',
  },
  max_restarts: 5,
  min_uptime: '10s',
  error_file: '/home/ubuntu/.pm2/logs/linkchest-api-error.log',
  out_file: '/home/ubuntu/.pm2/logs/linkchest-api-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
}

const webApp = {
  name: 'linkchest-web',
  script: '/opt/linkchest/api/project/deploy/start-web.sh',
  interpreter: '/bin/bash',
  cwd: '/opt/linkchest/api/project/apps/web',
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  max_memory_restart: cfg.webMem,
  max_restarts: 5,
  min_uptime: '10s',
  env: {
    NODE_ENV: 'production',
    MARKET: market,
    NODE_OPTIONS: `--max-old-space-size=${cfg.webHeap}`,
  },
  error_file: '/home/ubuntu/.pm2/logs/linkchest-web-error.log',
  out_file: '/home/ubuntu/.pm2/logs/linkchest-web-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
}

module.exports = {
  apps: [webApp, apiApp],
}
