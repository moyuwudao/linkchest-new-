-- LinkChest PostgreSQL 性能调优 - 国内版
-- 目标服务器：国内数据层 (114.132.81.246)
-- 服务器内存：4GB
-- 更新时间: 2026-06-05
--
-- 注意：shared_buffers 已在 docker-compose.cn.yml 中通过 command 设置为 1GB
--       本文件只处理 ALTER SYSTEM 即可在线 reload 的参数

-- 优化器提示：OS 缓存可用内存
-- 4G 内存中，预留 1GB 给 OS/Redis/其他，给 PG 缓存 3GB
ALTER SYSTEM SET effective_cache_size = '3072MB';

-- 单查询工作内存
-- 8MB 适合国内版（连接数较少，并发适中）
ALTER SYSTEM SET work_mem = '8MB';

-- 维护操作（VACUUM, CREATE INDEX）专用内存
ALTER SYSTEM SET maintenance_work_mem = '256MB';

-- SSD 存储时降低随机扫描成本
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
