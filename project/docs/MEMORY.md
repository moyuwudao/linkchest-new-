# LinkChest 项目记忆档案

> 记录时间：2026-05-10
> 项目路径：`D:\trae_projects\linkchest\project`
> WSL 实例：`linkchest` (Ubuntu 24.04 LTS)
> WSL 位置：`D:\WSL\linkchest`

---

## 项目概览

LinkChest 是一个书签管理应用，采用 monorepo 结构。

### 项目结构

```
D:\trae_projects\linkchest\project
├── apps/
│   ├── mobile/          # React Native + Expo 移动端
│   │   ├── android/     # Android 原生项目（prebuild 生成）
│   │   ├── package.json
│   │   └── eas.json     # EAS Build 配置
│   ├── web/             # Web 端
│   ├── api/             # 后端 API
│   └── chrome-extension/ # 浏览器扩展
├── packages/
│   └── i18n/            # 国际化包
└── package.json         # 根目录 monorepo 配置
```

### 技术栈

- **前端**：React 18.2 + TypeScript
- **移动端**：React Native 0.74 + Expo 51
- **状态管理**：Zustand
- **数据获取**：TanStack Query (React Query)
- **导航**：React Navigation 6
- **后端通信**：Axios
- **推送通知**：Firebase Messaging
- **存储**：AsyncStorage + Expo SecureStore

---

## APK 构建方案（WSL linkchest）

### 环境信息

| 组件 | 版本/路径 |
|------|----------|
| WSL 实例 | `linkchest` (Ubuntu 24.04 LTS) |
| WSL 位置 | `D:\WSL\linkchest` |
| Node.js | 20.x |
| Java | OpenJDK 17 (`/usr/lib/jvm/java-17-openjdk-amd64`) |
| Android SDK | `/opt/android-sdk` |
| platform-tools | 已安装 |
| build-tools | 34.0.0 |
| platforms | android-34 |
| NDK | 26.1.10909125 |

### WSL 环境变量配置（~/.bashrc）

```bash
# Android SDK
export ANDROID_HOME=/opt/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$PATH

# Java
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

### 国内镜像配置

#### 1. Gradle 下载镜像
文件：`apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`
```properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.8-all.zip
```

#### 2. Maven 仓库镜像
文件：`apps/mobile/android/build.gradle`
```gradle
repositories {
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/public' }
    maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }
    mavenCentral()
}
```

文件：`apps/mobile/android/react-settings-plugin/build.gradle.kts`
```kotlin
repositories {
    maven { url = uri("https://maven.aliyun.com/repository/public") }
    mavenCentral()
}
```

### 构建命令

#### 完整构建流程（首次或 clean 后）
```bash
# 进入 WSL linkchest
wsl -d linkchest

# 设置环境变量
export ANDROID_HOME=/opt/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH

# 进入项目目录
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 构建 Release APK
./gradlew assembleRelease --no-daemon
```

#### 增量构建（推荐日常使用）
```bash
wsl -d linkchest -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android && export ANDROID_HOME=/opt/android-sdk && export PATH=\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/local/bin:/usr/bin:/bin:\$PATH && ./gradlew assembleRelease --no-daemon"
```

#### 使用离线模式（依赖已缓存时更快）
```bash
./gradlew assembleRelease --no-daemon --offline
```

### APK 输出位置

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 注意事项

1. **不要删除 WSL 实例**：`linkchest` 包含了完整的 Android 构建环境，删除后需要重新安装所有组件。

2. **Gradle Daemon**：使用 `--no-daemon` 避免后台进程占用资源，后续构建可去掉此参数加速。

3. **预构建步骤**：如果修改了原生配置，需要先执行：
   ```bash
   npx expo prebuild --platform android --clean
   ```

4. **EAS Build 替代方案**：如需云端构建，使用：
   ```bash
   eas build --platform android --profile preview
   ```
   （需要 Expo 账号登录）

5. **镜像失效处理**：如果国内镜像无法访问，可尝试替换为其他镜像源：
   - 华为镜像：`https://repo.huaweicloud.com/repository/maven/`
   - 清华镜像：`https://mirrors.tuna.tsinghua.edu.cn/gradle/`

---

## 历史记录

### 2026-05-10
- 安装 WSL `linkchest` 到 D 盘
- 在 WSL 中配置 Android 构建环境（Node.js 20, OpenJDK 17, Android SDK）
- 配置国内镜像（腾讯云 Gradle + 阿里云 Maven）
- 成功构建 Release APK（73MB）
- 将项目从 `C:\Users\Mayn\CodeBuddy\20260407184558` 迁移到 `D:\trae_projects\linkchest\project`
- 创建本记忆档案
