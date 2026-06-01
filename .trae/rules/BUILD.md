---
alwaysApply: false
description: 构建流程规范 - API/Web/Mobile/Chrome扩展构建流程
---

# BUILD.md — 构建流程规范

> 本文档定义 LinkChest 项目中各模块的构建流程和规范。

---

## 1. 项目结构

```
linkchest/
├── apps/
│   ├── api/          # 后端 API
│   ├── web/          # Web 前端
│   ├── mobile/       # 移动端 (React Native)
│   └── chrome-extension/  # Chrome 扩展
├── packages/
│   └── shared/       # 共享模块
├── turbo.json        # Turbo 配置
└── package.json      # 根依赖
```

---

## 2. 通用构建命令

### 2.1 Turbo 构建

```bash
# 构建所有项目
npm run build

# 构建特定项目
npm run build --filter=@linkchest/api
npm run build --filter=@linkchest/web
npm run build --filter=@linkchest/mobile
npm run build --filter=@linkchest/chrome-extension

# 清理构建产物
npm run clean

# 增量构建（仅构建变更的项目）
npm run build --filter=@linkchest/web...
```

### 2.2 开发模式

```bash
# 启动所有开发服务器
npm run dev

# 启动特定项目
npm run dev --filter=@linkchest/api
npm run dev --filter=@linkchest/web
```

---

## 3. API 构建

### 3.1 构建命令

```bash
# 进入 API 目录
cd apps/api

# 安装依赖
npm install

# 构建
npm run build

# 开发模式
npm run dev

# 生产启动
npm run start
```

### 3.2 环境变量

| 变量 | 说明 | 示例 | 必填 |
|------|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接地址 | `postgresql://user:pass@localhost:5432/linkchest` | ✅ |
| `JWT_SECRET` | JWT 密钥 | `your-secret-key` | ✅ |
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` | ✅ |
| `PORT` | 服务端口 | `3000` | ✅ |
| `COS_SECRET_ID` | 腾讯云 COS SecretId | `AKIDxxxxxxxxxxxxxxxx` | ✅ |
| `COS_SECRET_KEY` | 腾讯云 COS SecretKey | `xxxxxxxxxxxxxxxxxxxx` | ✅ |
| `COS_BUCKET` | 存储桶名称 | `linkchest-global-12345` | ✅ |
| `COS_REGION` | 存储桶地域 | `ap-singapore` / `ap-nanjing` | ✅ |

> **⚠️ 重要**：`COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_BUCKET` / `COS_REGION` 是封面/头像上传的必需配置。缺失会导致上传接口返回 503 `UPLOAD_COS_NOT_CONFIGURED` 错误。
>
> **⚠️ 关键**：`start-api.sh` 启动脚本只加载 `.env` 文件。如果环境变量写在 `.env.global` 或 `.env.china` 中，必须同步到 `.env`：
> ```bash
> # 海外
cat .env.global >> .env
> # 国内
cat .env.china >> .env
> ```
> 否则 API 进程读不到 COS 配置，上传会提示"配置未完成"。

### 3.3 构建产物

```
apps/api/
└── dist/
    ├── index.js          # 入口文件
    ├── routes/           # 路由
    ├── services/         # 服务层
    └── lib/              # 工具函数
```

---

## 4. Web 构建

### 4.1 构建命令

```bash
# 进入 Web 目录
cd apps/web

# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run start
```

### 4.2 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | API 地址 | `/api` |
| `NEXT_PUBLIC_MARKET` | 市场标识（区分海外/国内版本） | `global` 或 `china` |
| `NEXT_PUBLIC_APP_URL` | 应用地址 | `http://localhost:3001` |

> **⚠️ 重要**：`NEXT_PUBLIC_MARKET` 是必需的环境变量，用于区分海外版和国内版的显示内容。
> - 海外版：`NEXT_PUBLIC_MARKET=global`（显示 Google Play 下载按钮）
> - 国内版：`NEXT_PUBLIC_MARKET=china`（显示应用宝下载按钮）
> 
> **构建时必须确保 `.env.production` 文件中包含此变量**。此变量必须在构建前注入，不能通过 PM2 运行时设置。

### 4.3 构建产物

```
apps/web/
└── .next/
    ├── static/           # 静态资源
    ├── server/           # 服务端代码
    └── client/           # 客户端代码
```

---

## 5. Mobile 构建

### 5.1 Android 构建

> **🔴 强制要求：WSL 构建**
> 
> **未经用户明确同意，禁止在 Windows 本地构建 APK！所有 APK 构建必须在 WSL 环境中执行。**
> 
> **原因：**
> - - ✅ WSL 已预配置完整构建环境（Android SDK、Java 17、NDK、Gradle 等）
  - 国际版：`linkchest-global` 实例
  - 国内版：`linkchest-cn` 实例
> - ✅ 环境变量、国内镜像、构建工具全部配置妥当
> - ✅ 避免 Windows 原生环境的兼容性问题和依赖重复下载
> - ✅ 构建速度更快，无需重新下载依赖
> 
> **重要：** WSL 内环境已安排妥帖，要想办法构建，不要动不动就下载依赖！优先使用已缓存的依赖和离线模式。

#### 5.1.1 环境要求

| 组件 | 要求 |
|------|------|
| WSL | Ubuntu 24.04 LTS（**强制要求**，双实例：国际版用 `linkchest-global`，国内版用 `linkchest-cn`） |
| Node.js | 20.x（WSL 内已安装） |
| Java | OpenJDK 17（`/usr/lib/jvm/java-17-openjdk-amd64`） |
| Android SDK | `/opt/android-sdk`（WSL 预配置） |
| build-tools | 34.0.0（WSL 预安装） |
| platforms | android-34（WSL 预安装） |
| NDK | 26.1.10909125（WSL 预安装） |

#### 5.1.2 通用构建命令

> **⚠️ 重要：避免使用 `clean` 命令，会清除已缓存的文件！**

```bash
# 进入 Android 目录
cd apps/mobile/android

# 推荐：标准构建（保留缓存）
./gradlew assembleRelease --no-daemon --no-configuration-cache

# 推荐：增量构建（更快，保留所有缓存）
./gradlew assembleRelease --no-daemon --no-configuration-cache
```

**缓存保护规则：**
| 命令 | 是否删除缓存 | 适用场景 |
|------|--------------|----------|
| `./gradlew assembleRelease --no-configuration-cache` | ❌ 不删除 | 日常增量构建（推荐） |
| `./gradlew clean assembleRelease --no-configuration-cache` | ✅ 删除项目构建缓存 | 仅在项目配置大幅变更时使用 |
| `./gradlew cleanBuildCache` | ✅ 删除全局构建缓存 | **禁止使用**（会删除所有项目缓存） |

> **🔴 强制要求：除非有明确理由，否则禁止使用 `clean` 和 `cleanBuildCache` 命令！**

#### 5.1.3 Gradle 镜像配置（强制）

> **🔴 强制要求：Gradle 下载必须使用国内镜像地址！**

**Gradle Wrapper 镜像** (`apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`)：
```properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.8-all.zip
```

> **⚠️ 重要：** 每次 prebuild 后会重新生成 `gradle-wrapper.properties`，**必须检查并恢复为国内镜像**，否则下次构建会从官方地址下载！

**Maven 仓库镜像** (`apps/mobile/android/build.gradle`)：
```gradle
repositories {
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/public' }
    maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }
    mavenCentral()
}
```

**镜像验证：** 构建前必须确认以上配置已正确设置，确保 Gradle 和依赖从国内镜像下载，避免网络问题导致构建失败。

#### 5.1.4 Gradle 缓存配置（强制）

> **🔴 强制要求：必须启用 Gradle 缓存，避免反复下载依赖！**

**gradle.properties 缓存配置：**
```properties
# Gradle 构建优化（启用缓存）
org.gradle.caching=true
org.gradle.configuration-cache=true
org.gradle.parallel=true

# 阿里云 Maven 镜像（全局配置）
systemProp.maven.repo.local=/home/mayn/.m2/repository
systemProp.org.gradle.project.repos.aliyun=https://maven.aliyun.com/repository/public
systemProp.org.gradle.project.repos.aliyun-google=https://maven.aliyun.com/repository/google
systemProp.org.gradle.project.repos.aliyun-gradle-plugin=https://maven.aliyun.com/repository/gradle-plugin
```

**缓存路径说明：**
| 缓存类型 | 路径 | 说明 |
|----------|------|------|
| Gradle 发行包 | `/home/mayn/.gradle/wrapper/dists/` | 首次下载后永久缓存 |
| Maven 依赖 | `/home/mayn/.m2/repository/` | 所有项目共享 |
| 构建缓存 | `/home/mayn/.gradle/caches/` | 增量构建缓存 |

#### 5.1.5 离线模式（⚠️ 不推荐）

> **⚠️ 警告：离线模式（`--offline`）仅在依赖完全缓存后才能使用。**
> 
> **实际经验：** prebuild 重新生成 Android 项目后，依赖配置可能变化，离线模式会导致构建失败（`No cached version available for offline mode`）。
> 
> **建议：** 除非明确知道所有依赖已缓存且未变更，否则**不要使用 `--offline`**。使用国内镜像已足够快。

#### 5.1.6 Prebuild 后图标修复（⚠️ 重要）

> **🔴 强制要求：prebuild 会覆盖手动修复的图标，必须在构建前恢复！**

**问题原因：**
`npx expo prebuild --platform android` 会根据 `app.json` 中的 `icon` 和 `adaptiveIcon` 配置重新生成 Android 项目的 `res/mipmap-*/` 图标文件，这会覆盖之前手动修复的图标。

**修复流程：**
```bash
# 1. prebuild 后，从 assets/icons/android/ 复制修复后的图标
for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    cp project/assets/icons/android/mipmap-${dir}/ic_launcher.png \
       project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher.png
    cp project/assets/icons/android/mipmap-${dir}/ic_launcher.png \
       project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png
done

# 2. 复制前景图到所有密度目录
for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    cp project/assets/icons/android/ic_launcher_foreground.png \
       project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher_foreground.png
done

# 3. 验证 Gradle 镜像配置未被 prebuild 覆盖
cat project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl
# 必须是 mirrors.cloud.tencent.com，如果不是需要恢复
```

**长期解决方案：**
修改 `apps/mobile/assets/icon.png` 和 `apps/mobile/assets/adaptive-icon.png` 为正确版本，这样 prebuild 自动生成的图标就是正确的，无需手动修复。

#### 5.1.7 Metro 配置（🔴 关键）

> **🔴 强制要求：metro.config.js 必须正确配置 JSON 文件处理，否则 i18n 翻译内容不会进入 bundle！**

**必须配置项：**

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// ... 其他配置 ...

// 确保 .json 文件被 Metro 当作源代码内联到 bundle 中
// 默认 Expo 配置将 json 放在 assetExts 中，require() 返回资源 URI
// 必须把它移到 sourceExts，让 require() 返回解析后的 JS 对象
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'cjs', 'json'])];
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'json');

module.exports = config;
```

**验证方式：**
```bash
# 构建后检查 bundle 中是否包含翻译内容
strings android/app/build/generated/assets/createBundle*ReleaseJsAndAssets/index.android.bundle | grep -c '"pro":"Pro"'
# 输出应 > 0，否则说明 JSON 未内联
```

**问题案例：** [CASE-021](cases/apk-build-errors.md#case-021-metro-未内联-json-翻译文件导致-i18n-显示键名)

#### 5.1.8 执行构建

**唯一允许的构建方式：**

```bash
# ✅ 方式1：通过 PowerShell 统一入口（推荐，支持并行构建）
.\project\apps\mobile\build-apk.ps1           # 并行构建两个版本
.\project\apps\mobile\build-apk.ps1 global    # 只构建国际版
.\project\apps\mobile\build-apk.ps1 china     # 只构建国内版

```bash
# ✅ 方式2：直接通过 WSL 构建（单版本）
# 海外版
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh global

# 国内版
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china
```

**构建脚本特性：**
- 自动设置 JAVA_HOME 和 ANDROID_HOME 环境变量
- 自动配置 APK 签名密钥
- 生成带时间戳的 APK 文件名（见 5.1.10）
- 构建失败时自动捕获日志并输出最后 50 行错误
- 支持关键词匹配异常案例（见 BUILD_RED_LINES.md 5.2 节）

**禁止的任何其他方式：**
- ❌ `npx expo prebuild --platform android --clean`
- ❌ `cd android && ./gradlew assembleRelease`
- ❌ `eas build --platform android`
- ❌ 任何在 Windows PowerShell/CMD 中执行的构建命令
- ❌ 使用 `clean` 或 `--clean` 参数

#### 5.1.9 国内外分版本构建（🔴 重要）

> **本文档定义 LinkChest 移动端国内外分版本 APK 构建的完整流程。**
> 
> **核心原则：** 海外版 (`global`) 和国内版 (`china`) 必须完全分开构建，使用不同的包名、应用名和 API 地址。

##### 5.1.8.1 版本区别

| 配置项 | 海外版 (`global`) | 国内版 (`china`) |
|--------|-------------------|------------------|
| 应用名称 | LinkChest | 链藏 |
| 包名 | `com.linkchest.app` | `cn.linkchest.app` |
| API 地址 | `https://linkchest.net/api` | `https://linkchest.cn/api` |
| 登录方式 | Google (+ iOS Apple) | 微信 (+ iOS Apple) |
| 支付方式 | PayPal, Google Pay | 微信支付 |

##### 5.1.8.2 构建前准备

**1. 确认 `app.json` 市场配置**

`project/apps/mobile/app.json` 中的 `extra.market` 字段决定构建版本：

```json
{
  "expo": {
    "extra": {
      "market": "global"
    }
  }
}
```

**⚠️ 重要：** 构建前必须确认 `app.json` 中的 `market` 字段与目标版本一致！

**2. 确认 `build.gradle` 配置**

`project/apps/mobile/android/app/build.gradle` 使用 `productFlavors` 区分版本：

```gradle
flavorDimensions += "market"
productFlavors {
    global {
        dimension "market"
        applicationId 'com.linkchest.app'
        resValue "string", "app_name", "LinkChest"
    }
    china {
        dimension "market"
        applicationId 'cn.linkchest.app'
        resValue "string", "app_name", "链藏"
    }
}
```

**3. 确认 `google-services.json` 配置**

`project/apps/mobile/android/app/google-services.json` 必须包含两个版本的客户端配置：

```json
{
  "client": [
    {
      "client_info": {
        "android_client_info": {
          "package_name": "com.linkchest.app"
        }
      }
    },
    {
      "client_info": {
        "android_client_info": {
          "package_name": "cn.linkchest.app"
        }
      }
    }
  ]
}
```

##### 5.1.8.3 分版本构建命令

> **双 WSL 架构**：国际版和国内版各有独立的 WSL 实例，无需手动切换配置。
>
> **当需要同时构建两个版本时，推荐使用并行构建**，总耗时接近单次构建。

**并行构建两个版本（推荐）：**

```powershell
# 两个 WSL 实例同时构建，耗时约 10 分钟
.\project\apps\mobile\build-apk.ps1
```

**单独构建国际版：**

```bash
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

**单独构建国内版：**

```bash
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

##### 5.1.8.4 构建输出位置

构建成功后，APK 位于：

```
apps/mobile/android/app/build/outputs/apk/
├── global/release/linkchest-global-release.apk    # 海外版
├── china/release/linkchest-china-release.apk      # 国内版
└── release/                                        # 统一发布目录
    ├── linkchest-global-release.apk
    └── linkchest-china-release.apk
```

##### 5.1.8.5 关键注意事项

**1. 双 WSL 架构已解决缓存冲突问题**

> 旧架构（单 WSL 串行构建）存在 Metro 缓存冲突和 `.env.market` 文件竞争问题。
> 双 WSL 架构（`linkchest-global` + `linkchest-cn`）从根本上解决了这些问题：
> - 每个 WSL 实例有独立的 Metro 缓存，切换 flavor 不再需要清缓存
> - 构建脚本自动通过 `WSL_DISTRO_NAME` 检测 flavor，无需手动配置
> - 并行构建时两个实例互不干扰

**2. app.config.js 市场配置机制**

`app.config.js` 通过以下方式确定市场（MARKET）：

```
优先级：.env.market 文件 > process.env.MARKET > 默认值 'global'
```

- 构建脚本 `build-gradle.sh` 在构建前自动写入 `.env.market`
- 每个 WSL 实例自动检测 `WSL_DISTRO_NAME` 确定构建的 flavor
- 无需手动修改任何配置文件

**3. expo-constants 缓存（仅单 WSL 环境需关注）**

> 双 WSL 架构下此问题已基本消除，但如遇到 `Constants.expoConfig.extra.market` 读取为旧值，可手动清理：

```bash
rm -rf app/build/generated/assets/expo-constants
rm -rf app/build/generated/res/expo-constants
rm -rf ../node_modules/expo-constants/android/build
./gradlew :expo-constants:clean :expo-constants:build --no-daemon --no-configuration-cache
```

**4. 包名和原生代码**

- 原生 Kotlin 代码包名保持 `com.linkchest.app` 不变
- 通过 `productFlavors` 的 `applicationId` 设置实际包名
- `namespace` 在 `build.gradle` 中保持 `com.linkchest.app`

**5. 构建顺序**

- 两个版本可以独立构建，没有先后依赖
- **推荐并行构建**：`.\project\apps\mobile\build-apk.ps1`，耗时约 10 分钟
- 单独构建时无顺序要求
- 构建完成后，两个 APK 可以共存安装

##### 5.1.8.6 验证清单

构建完成后，必须验证以下项目：

| 检查项 | 海外版 | 国内版 |
|--------|--------|--------|
| 应用名称 | LinkChest | 链藏 |
| 包名 | `com.linkchest.app` | `cn.linkchest.app` |
| API 地址 | `https://linkchest.net/api` | `https://linkchest.cn/api` |
| 登录按钮 | Google (+ iOS Apple) | 微信 (+ iOS Apple) |
| 登录功能 | 可用 | 可用 |
| `.env.market` 文件 | 存在，内容为 `global` | 存在，内容为 `china` |

**验证命令：**
```bash
# 检查 APK 包名
aapt dump badging linkchest-global-release.apk | grep package
aapt dump badging linkchest-china-release.apk | grep package

# 检查应用名称
aapt dump badging linkchest-global-release.apk | grep application-label
aapt dump badging linkchest-china-release.apk | grep application-label
```

#### 5.1.10 项目特定配置

> **详细规范请参考 `BUILD_RED_LINES.md`（构建时自动加载）。**
>
> 包含 WSL 实例配置（`linkchest-global` / `linkchest-cn`）、环境变量持久化设置（`.bashrc`）、增量构建命令、注意事项和故障排除。

#### 5.1.11 MARKET 环境变量验证

构建完成后，验证 `.env.market` 文件内容是否正确：

```bash
cat project/apps/mobile/.env.market
# 应输出: global 或 china
```

如果 `.env.market` 不存在或内容错误，APK 将使用默认配置（global），导致国内市场 APK 显示海外市场内容。

#### 5.1.12 APK 输出位置

构建成功后，APK 位于：

```
apps/mobile/android/app/build/outputs/apk/release/
```

#### 5.1.13 APK 命名规范（时间戳）

> **🔴 强制要求：所有交付的 APK 必须包含时间戳。**

为避免交付错误版本，APK 文件名格式：

```
linkchest-YYYYMMDD-HHMM.apk
```

**示例：**
- `linkchest-20260519-1430.apk` — 2026年5月19日 14:30 构建

构建脚本 `build-gradle.sh` 已自动实现此命名，构建成功后会将 `app-release.apk` 重命名为带时间戳的文件名。

**验证方式：**
```bash
ls -la apps/mobile/android/app/build/outputs/apk/release/linkchest-*.apk
```

### 5.2 iOS 构建

```bash
# 进入 Mobile 目录
cd apps/mobile

# 安装依赖
npm install

# 预构建
npx expo prebuild --platform ios

# 使用 Xcode 构建
# 打开 apps/mobile/ios/LinkChest.xcworkspace
# 选择目标设备或模拟器
# 点击 Build
```



## 6. Chrome Extension 构建

### 6.1 构建命令

```bash
# 进入 Chrome Extension 目录
cd apps/chrome-extension

# 安装依赖
npm install

# 开发模式（生成未压缩的扩展）
npm run dev

# 生产构建（生成压缩的扩展）
npm run build
```

### 6.2 构建产物

```
apps/chrome-extension/
└── dist/
    ├── manifest.json     # 扩展清单
    ├── background.js     # 后台脚本
    ├── content.js        # 内容脚本
    ├── popup.html        # 弹出页面
    └── assets/           # 静态资源
```

### 6.3 加载扩展

1. 打开 Chrome 浏览器
2. 进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist` 目录

---

## 7. 服务器部署

> **部署流程详见 [DEPLOYMENT.md](DEPLOYMENT.md)**，服务器信息和红线详见 [HIGH_RISK.md](HIGH_RISK.md)。

---

## 8. 构建检查清单

### 8.1 构建前检查

| 检查项 | 说明 |
|--------|------|
| **依赖安装** | 所有依赖已正确安装 |
| **环境变量** | 必要的环境变量已设置 |
| **代码检查** | lint 和 typecheck 通过 |
| **测试通过** | 所有测试已通过 |

### 8.2 构建后验证

| 检查项 | 说明 |
|--------|------|
| **产物生成** | 构建产物已生成 |
| **产物完整性** | 所有必要文件都存在 |
| **启动验证** | 应用能正常启动 |
| **功能测试** | 核心功能正常工作 |

---

## 9. CI/CD 构建

### 9.1 GitHub Actions 示例

```yaml
# .github/workflows/build.yml
name: Build
on: [push, pull_request]

jobs:
  build-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: npm run build --filter=@linkchest/api

  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: npm run build --filter=@linkchest/web

  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: npm run build --filter=@linkchest/mobile
```

---

## 10. 常见问题

### 10.1 Android 构建问题

> **遇到构建异常时，优先查阅 [APK构建异常案例集锦](cases/apk-build-errors.md)**

| 问题 | 解决方案 | 案例编号 |
|------|----------|----------|
| Gradle 从官方地址下载 | 恢复国内镜像配置 | [CASE-001](cases/apk-build-errors.md#case-001-gradle-镜像被重置为官方地址) |
| 使用 clean 后重新下载依赖 | 禁止使用 clean 命令 | [CASE-002](cases/apk-build-errors.md#case-002-使用-clean-命令导致缓存被删除) |
| prebuild 后图标丢失 | 恢复图标文件 | [CASE-003](cases/apk-build-errors.md#case-003-prebuild-后图标被覆盖) |
| Gradle 反复下载依赖 | 检查镜像和缓存配置 | [CASE-004](cases/apk-build-errors.md#case-004-gradle-反复下载依赖) |
| 离线模式构建失败 | 移除 --offline 参数 | [CASE-005](cases/apk-build-errors.md#case-005-离线模式构建失败) |
| JAVA_HOME 未设置 | 设置环境变量 | [CASE-006](cases/apk-build-errors.md#case-006-wsl-环境变量未设置) |
| Gradle 版本不兼容 | 更新 Gradle Wrapper | [CASE-007](cases/apk-build-errors.md#case-007-gradle-版本不兼容) |
| PowerShell 引号转义错误 | 使用独立脚本文件 | [CASE-008](cases/apk-build-errors.md#case-008-构建脚本引号转义问题) |
| `Module was compiled with an incompatible version of Kotlin` | 更新 `build.gradle` 中的 `kotlinVersion` | - |
| `Could not find com.android.tools.build:gradle` | 检查 Maven 镜像配置 | - |
| 构建超时 | 使用 `--offline` 模式或增加超时时间 | - |
| `Starting an external process during configuration time is unsupported` | 添加 `--no-configuration-cache` 参数 | - |
| Gradle 配置缓存错误 | 所有构建命令必须包含 `--no-configuration-cache` | - |
| APK 功能未更新（旧代码） | 代码目录与构建目录不同步，构建前需同步 | [CASE-009](cases/apk-build-errors.md#case-009-代码目录与构建目录不同步) |
| `Unable to resolve module react-native-svg` | 安装 `react-native-svg` 依赖 | [CASE-017](cases/apk-build-errors.md#case-017-react-native-svg-依赖缺失导致构建失败) |
| 国内版显示 Google/Apple 登录（应为微信） | `Constants.expoConfig` 未就绪导致市场判断错误 | [CASE-018](cases/apk-build-errors.md#case-018-constantsexpoconfig-未就绪导致市场判断错误) |
| 国内版 API 请求返回 403 | API URL 使用 IP 地址而非域名 | [CASE-019](cases/apk-build-errors.md#case-019-国内版-api-url-使用-ip-地址导致-nginx-403) |
| Gradle 无法删除 build 目录 | Windows 文件锁定，修改构建目录或关闭占用进程 | [CASE-020](cases/apk-build-errors.md#case-020-windows-文件锁定导致-gradle-构建目录删除失败) |
| i18n 翻译显示为键名（如 `tier.pro`） | Metro 未内联 JSON，检查 metro.config.js 的 sourceExts | [CASE-021](cases/apk-build-errors.md#case-021-metro-未内联-json-翻译文件导致-i18n-显示键名) |

### 10.2 iOS 构建问题

| 问题 | 解决方案 |
|------|----------|
| `Xcode version not found` | 安装正确版本的 Xcode |
| `Provisioning profile not found` | 配置正确的签名证书 |
| `CocoaPods not installed` | 安装 CocoaPods |

### 10.3 服务构建问题

> **遇到构建异常时，优先查阅 [服务构建异常案例集锦](cases/service-build-errors.md)**

| 问题 | 解决方案 | 案例编号 |
|------|----------|----------|
| Turbo 构建失败 | 清理 Turbo 缓存 | [CASE-S001](cases/service-build-errors.md#case-s001-turbo-构建失败) |
| node_modules 缺失或损坏 | 重新安装依赖 | [CASE-S002](cases/service-build-errors.md#case-s002-node_modules-缺失或损坏) |
| 环境变量未加载 | 加载环境变量 | [CASE-S003](cases/service-build-errors.md#case-s003-环境变量未加载) |
| TypeScript 类型检查失败 | 修复类型错误 | [CASE-S004](cases/service-build-errors.md#case-s004-typescript-类型检查失败) |
| 依赖版本冲突 | 统一依赖版本 | [CASE-S005](cases/service-build-errors.md#case-s005-依赖版本冲突) |
| Chrome 扩展构建失败 | 检查扩展配置 | [CASE-S006](cases/service-build-errors.md#case-s006-chrome-扩展构建失败) |
| Node.js 内存不足 | 增加内存限制 | [CASE-S007](cases/service-build-errors.md#case-s007-nodejs-内存不足导致构建崩溃) |
| 开发服务器端口冲突 | 更换端口或关闭占用进程 | [CASE-S008](cases/service-build-errors.md#case-s008-端口冲突导致开发服务器无法启动) |
| **部署后功能回退** | 服务器多目录不同步，使用部署脚本 | [CASE-S009](cases/service-build-errors.md#case-s009-部署后功能回退到旧版本) |

### 10.4 环境/依赖问题

> **遇到环境异常时，优先查阅 [环境依赖异常案例集锦](cases/env-dependency-errors.md)**

| 问题 | 解决方案 | 案例编号 |
|------|----------|----------|
| WSL 实例未启动 | 启动或重新创建实例 | [CASE-E001](cases/env-dependency-errors.md#case-e001-wsl-实例未启动) |
| Node.js 版本不匹配 | 使用 nvm 切换版本 | [CASE-E002](cases/env-dependency-errors.md#case-e002-nodejs-版本不匹配) |
| Java 版本冲突 | 设置 JAVA_HOME | [CASE-E003](cases/env-dependency-errors.md#case-e003-java-版本冲突) |
| Android SDK 组件缺失 | 安装缺失组件 | [CASE-E004](cases/env-dependency-errors.md#case-e004-android-sdk-组件缺失) |
| WSL 路径挂载问题 | 修复挂载配置 | [CASE-E005](cases/env-dependency-errors.md#case-e005-wsl-路径挂载问题) |
| npm 权限问题 | 更改 npm 默认目录 | [CASE-E006](cases/env-dependency-errors.md#case-e006-npm-权限问题) |
| Git 配置问题 | 配置用户信息和 SSH | [CASE-E007](cases/env-dependency-errors.md#case-e007-git-配置问题) |
| 网络代理问题 | 配置代理或国内镜像 | [CASE-E008](cases/env-dependency-errors.md#case-e008-网络代理问题) |

### 10.5 Web 构建问题

| 问题 | 解决方案 |
|------|----------|
| `Module not found` | 检查依赖安装和路径配置 |
| `TypeScript errors` | 修复类型错误 |
| `Out of memory` | 增加 Node.js 内存限制 |

---

*最后更新：2026-06-01*
*版本：v1.4 — 新增 Metro JSON 内联配置要求（5.1.7），添加 CASE-021 常见问题引用*
