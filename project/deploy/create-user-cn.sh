#!/bin/bash
# 创建测试用户

sudo docker exec -e PGPASSWORD=LinkChest_DB_2026! linkchest-db psql -U linkchest -d linkchest -c "
INSERT INTO users (
  id, email, password_hash, nickname, lang, email_verified, 
  created_at, updated_at, role
) VALUES (
  gen_random_uuid(),
  'test@linkchest.cn',
  '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  '测试用户',
  'zh',
  true,
  NOW(),
  NOW(),
  'USER'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  updated_at = NOW();
"

echo "测试用户创建完成"

# 验证用户
sudo docker exec -e PGPASSWORD=LinkChest_DB_2026! linkchest-db psql -U linkchest -d linkchest -c "
SELECT email, nickname, role, created_at 
FROM users 
WHERE email = 'test@linkchest.cn';
"
