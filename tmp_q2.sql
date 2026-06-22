-- 统计每个用户的收藏数量
SELECT "userId", COUNT(*) AS total, COUNT("deletedAt") AS deleted
FROM collections
GROUP BY "userId"
ORDER BY total DESC
LIMIT 10;

-- 验证用户 23d96f32 的数据
SELECT COUNT(*) AS total, COUNT("deletedAt") AS deleted
FROM collections
WHERE "userId" = '23d96f32-76d0-438d-a21c-67344a056d1c';

-- 检查 title 字节长度
SELECT id, url, title, length(title) AS title_bytes, length(encode(title::bytea, 'escape')) AS title_bytea_len
FROM collections
WHERE "userId" = '23d96f32-76d0-438d-a21c-67344a056d1c'
ORDER BY "createdAt" DESC LIMIT 5;
