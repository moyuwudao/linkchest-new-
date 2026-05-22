# 上传迁移相关脚本到服务器
$SERVER = "ubuntu@VM-0-11-ubuntu"  # 或你的服务器IP
$REMOTE_PATH = "/opt/linkchest/api/deploy"

# 确保本地路径存在
$LocalPath = "C:\Users\Mayn\CodeBuddy\20260407184558\deploy"

# 上传新脚本
scp "$LocalPath\migrate-cos-to-lighthouse.py" "${SERVER}:${REMOTE_PATH}/"
scp "$LocalPath\cleanup-lhcos-backups.py" "${SERVER}:${REMOTE_PATH}/"
scp "$LocalPath\backup-db-cos.sh" "${SERVER}:${REMOTE_PATH}/"

Write-Host "✅ 脚本上传完成"
