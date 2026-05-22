#!/bin/bash
# 创建测试用户 - 使用正确的列名

sudo docker exec -e PGPASSWORD=LinkChest_DB_2026! linkchest-db psql -U linkchest -d linkchest -c "
INSERT INTO users (
  id, email, passwordHash, nickname, lang, 
  createdAt, updatedAt, status, authSource
) VALUES (
  gen_random_uuid(),
  'test@linkchest.cn',
  '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  '测试用户',
  'zh',
  NOW(),
  NOW(),
  'ACTIVE',
  'EMAIL'
)
ON CONFLICT (email) DO UPDATE SET
  passwordHash = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  updatedAt = NOW();
"

echo "测试用户创建完成"

# 验证用户
sudo docker exec -e PGPASSWORD=LinkChest_DB_2026! linkchest-db psql -U linkchest -d linkchest -c "
SELECT email, nickname, status, createdAt 
FROM users 
WHERE email = 'test@linkchest.cn';
"
