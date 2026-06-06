-- LinkChest PostgreSQL 性能调优 - 海外版
-- 目标服务器：新加坡数据层 (43.133.44.232)
-- 服务器内存：1.9GB 实际可用
-- 更新时间: 2026-06-05
--
-- 注意：shared_buffers 在 docker-compose.yml 中通过 command 设置
--       本文件只处理 ALTER SYSTEM 即可在线 reload 的参数

-- 优化器提示：OS 缓存可用内存（不是实际分配）
-- 1.9G 内存中，Postgres + Redis 共用，建议给 OS 缓存 1.2GB
ALTER SYSTEM SET effective_cache_size = '1280MB';

-- 单查询工作内存（连接数多时要谨慎，过大会爆）
-- 4MB 在 1.9G 服务器上较安全
ALTER SYSTEM SET work_mem = '4MB';

-- 维护操作（VACUUM, CREATE INDEX）专用内存
ALTER SYSTEM SET maintenance_work_mem = '128MB';

-- SSD 存储时降低随机扫描成本（默认 4 → 1.1 接近 SSD）
ALTER SYSTEM SET random_page_cost = 1.1;

-- SSD 并发读能力
ALTER SYSTEM SET effective_io_concurrency = 200;

-- 在线 reload 配置
SELECT pg_reload_conf();

-- 验证
SHOW work_mem;
SHOW effective_cache_size;
SHOW random_page_cost;
SHOW maintenance_work_mem;
