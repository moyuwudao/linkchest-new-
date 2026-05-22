# 快速构建指南

## 最简单的构建方法（推荐）

### 方法一：使用批处理文件

双击运行：
```
project/apps/mobile/build-apk.bat
```

---

### 方法二：使用命令行（最可靠）

打开 PowerShell，进入项目目录，运行：

```powershell
wsl -d linkchest -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android && export ANDROID_HOME=/opt/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:$PATH && ./gradlew assembleRelease --no-daemon --no-configuration-cache"
```

---

### 方法三：分步在 WSL 中运行

```powershell
# 1. 进入 WSL
wsl -d linkchest

# 2. 设置环境变量
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$JAVA_HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH

# 3. 进入项目目录
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 4. 构建 APK
./gradlew assembleRelease --no-daemon --no-configuration-cache

# 5. 退出 WSL
exit
```

---

## 构建选项

| 选项 | 说明 |
|------|------|
| `--no-daemon` | 不使用 Gradle 守护进程（推荐） |
| `--no-configuration-cache` | 禁用配置缓存（解决构建错误） |
| `--offline` | 离线模式（依赖已缓存时更快） |
| `assembleDebug` | 构建 Debug 版本 |
| `assembleRelease` | 构建 Release 版本 |
| `clean assembleRelease` | 清理后重新构建 |

---

## 常用构建命令

### 标准构建
```bash
./gradlew assembleRelease --no-daemon --no-configuration-cache
```

### 快速构建（离线）
```bash
./gradlew assembleRelease --no-daemon --no-configuration-cache --offline
```

### 清理后重新构建
```bash
./gradlew clean assembleRelease --no-daemon --no-configuration-cache
```

### Debug 版本
```bash
./gradlew assembleDebug --no-daemon --no-configuration-cache
```

---

## APK 输出位置

构建成功后，APK 文件位于：

```
project/apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 常见问题

### Q1: 提示权限不足
```bash
# 在 WSL 中运行
chmod +x /mnt/d/trae_projects/linkchest/project/apps/mobile/android/gradlew
```

### Q2: 网络下载失败
- 确保网络连接正常
- 项目已配置国内镜像（阿里云、腾讯云）
- 第一次构建后，依赖会被缓存

### Q3: 构建速度慢
- 第一次构建需要下载依赖，较慢（5-15分钟）
- 后续使用 `--offline` 模式，会很快（1-3分钟）

### Q4: 配置缓存错误
- 脚本已包含 `--no-configuration-cache` 参数，无需额外处理

---

## 详细文档

- WSL 构建完整指南: `.trae/rules/linkchest-build-apk.md`
- 项目构建规范: `.trae/rules/BUILD.md`
