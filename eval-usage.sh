#!/bin/bash
echo "=== API 进程详情 ==="
ps -o pid,pcpu,pmem,rss,vsz,etime,cmd -p $(pm2 jlist 2>/dev/null | python3 -c "import json,sys; data=json.load(sys.stdin); [print(p['pid']) for p in data if p['name']=='linkchest-api']" 2>/dev/null) 2>&1
echo ""
echo "=== Node.js 监听端口 ==="
ss -tlnp 2>&1 | grep node | head -5
echo ""
echo "=== MongoDB / MySQL / Redis 进程 ==="
ps aux | grep -E 'mongo|mysql|redis' | grep -v grep | head -5
echo ""
echo "=== 当前用户总数（数据库） ==="
cd /opt/linkchest/api/project
node -e "
const mysql = require('mysql2/promise');
const cfg = require('./apps/api/.env.production');
const conn = mysql.createPool({
  host: cfg.DB_HOST, port: +cfg.DB_PORT, user: cfg.DB_USER, password: cfg.DB_PASSWORD, database: cfg.DB_NAME
});
(async () => {
  const [users] = await conn.query('SELECT COUNT(*) as total FROM users');
  console.log('  users total:', users[0].total);
  const [active7d] = await conn.query(\"SELECT COUNT(DISTINCT user_id) as active FROM collections WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)\");
  console.log('  active 7d:', active7d[0].active);
  const [active30d] = await conn.query(\"SELECT COUNT(DISTINCT user_id) as active FROM collections WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)\");
  console.log('  active 30d:', active30d[0].active);
  const [colToday] = await conn.query(\"SELECT COUNT(*) as cnt FROM collections WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)\");
  console.log('  collections today:', colToday[0].cnt);
  const [colTotal] = await conn.query(\"SELECT COUNT(*) as cnt FROM collections\");
  console.log('  collections total:', colTotal[0].cnt);
  const [paidUsers] = await conn.query(\"SELECT COUNT(*) as paid FROM users WHERE tier != 'free' AND tier IS NOT NULL\");
  console.log('  paid users:', paidUsers[0].paid);
  await conn.end();
})();
" 2>&1
echo ""
echo "=== 最近 24h 封面抓取任务（队列/任务表） ==="
cd /opt/linkchest/api/project
node -e "
const mysql = require('mysql2/promise');
const cfg = require('./apps/api/.env.production');
const conn = mysql.createPool({
  host: cfg.DB_HOST, port: +cfg.DB_PORT, user: cfg.DB_USER, password: cfg.DB_PASSWORD, database: cfg.DB_NAME
});
(async () => {
  try {
    const [tables] = await conn.query(\"SHOW TABLES LIKE 'cover%'\");
    console.log('  cover 表:', tables);
    const [tables2] = await conn.query(\"SHOW TABLES LIKE '%job%'\");
    console.log('  job 表:', tables2);
  } catch (e) { console.log('err:', e.message); }
  await conn.end();
})();
" 2>&1
