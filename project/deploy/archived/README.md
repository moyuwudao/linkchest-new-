# 已归档的部署脚本

这些脚本已被 Git-Only 部署策略替代，保留仅供历史参考。

## 归档原因

2026-05-22 起，所有服务器部署统一使用 Git-Only 策略：
- 海外：`bash deploy/update-server.sh`
- 国内：`bash deploy/update-server-cn.sh`
- 统一入口：`bash deploy/deploy.sh <global|china>`

## 归档脚本说明

| 脚本 | 原用途 | 替代方案 |
|------|--------|----------|
| deploy-cn.sh | rsync 本地代码到国内服务器 | deploy.sh + update-server-cn.sh |
| deploy-china-exec.sh | WSL 版本国内部署 | deploy.sh + update-server-cn.sh |
| deploy-web-cn.sh | 本地构建 .next 上传国内 | update-server-cn.sh（服务器端构建）|
| sync-web-cn.sh | 补丁式同步 .next | update-server-cn.sh |
| sync-next-config.sh | 补丁式同步 next.config.js | git pull 自动包含 |
| sync-public.sh | 补丁式同步 public/ | git pull 自动包含 |

**禁止重新启用这些脚本！** 它们违反 Git-Only 策略。
