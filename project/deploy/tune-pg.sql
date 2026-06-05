-- LinkChest PostgreSQL 性能调优（在线 reload 部分）
-- 4G 内存推荐配置
ALTER SYSTEM SET effective_cache_size = '3072MB';
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
SELECT pg_reload_conf();
SHOW work_mem;
SHOW effective_cache_size;
SHOW random_page_cost;
