# 已归档的 APK 构建脚本

这些脚本已被新的构建系统替代，保留仅供历史参考。

## 归档原因

2026-05-22 起，APK 构建统一使用双 WSL 架构：
- 统一入口：`.uild-apk.ps1`（支持并行构建 global + china）
- 实际构建：`build-gradle.sh`（WSL 内执行，自动检测 flavor）

## 归档脚本说明

| 脚本 | 原用途 | 问题 | 替代方案 |
|------|--------|------|----------|
| build-apk.bat | 旧版构建入口 | 使用旧 WSL 实例 `linkchest`，无 flavor 区分 | build-apk.ps1 |
| rebuild-apk.bat | 重新构建 | 使用 `--clean`（违反红线），旧 WSL 实例 | build-apk.ps1 |
| build-apk-full.sh | 完整构建 | 执行 prebuild（破坏配置），无 flavor | build-gradle.sh |
| build-apk-direct.sh | 直接构建 | 绕过 Gradle wrapper，无 flavor | build-gradle.sh |
| build-china.sh | 国内版构建 | 修改 app.json 而非 .env.market | build-gradle.sh |

**禁止重新启用这些脚本！**
