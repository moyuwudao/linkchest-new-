# LinkChest APK 构建方案

## 🚀 WSL 构建（唯一推荐方案）

你的 WSL `linkchest` 实例已配置完成，这是最快最直接的构建方案。

### 快速开始

**方法 1：双击批处理文件（最简单）**

找到并双击：
```
project/apps/mobile/build-apk.bat
```

**方法 2：命令行**

```powershell
cd project/apps/mobile
.\build-apk.bat
```

**方法 3：手动 WSL 构建**

```powershell
wsl -d linkchest -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android && export ANDROID_HOME=/opt/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:$PATH && ./gradlew assembleRelease --no-daemon --no-configuration-cache"
```

### 优点

- ✅ 环境已配置好，无需安装新软件
- ✅ 使用国内镜像，速度快
- ✅ 本地构建，完全控制
- ✅ 依赖已缓存，增量构建很快

---

## 📖 详细文档

- **构建规范**: `.trae/rules/BUILD.md`

---

## 💡 使用建议

### 日常开发（推荐）

使用 **离线模式**（更快）：
```powershell
cd project/apps/mobile/android
wsl -d linkchest -u mayn -- bash -c "export ANDROID_HOME=/opt/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:$PATH && ./gradlew assembleRelease --no-daemon --no-configuration-cache --offline"
```

### 首次构建或修改配置

使用 **清理构建**：
```powershell
cd project/apps/mobile/android
wsl -d linkchest -u mayn -- bash -c "export ANDROID_HOME=/opt/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:$PATH && ./gradlew clean assembleRelease --no-daemon --no-configuration-cache"
```

---

## 🔍 故障排除

### 常见问题

**问题1: 网络错误**
```powershell
# 先在线构建一次缓存依赖
.\build-apk.bat
# 之后可以用离线模式
```

**问题2: 权限错误**
```bash
wsl -d linkchest
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
chmod +x gradlew
```

**问题3: 配置缓存错误**
- 脚本已包含 `--no-configuration-cache` 参数，无需额外处理

---

## 📝 构建输出位置

APK 生成在：
```
project/apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

*最后更新：2026-05-12*
