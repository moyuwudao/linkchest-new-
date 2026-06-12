---
alwaysApply: false
description: APK构建异常案例集锦 - Gradle、WSL、镜像、缓存、图标等构建问题
---

# APK 构建异常案例集锦

> 记录所有 APK 构建过程中遇到的异常及解决方案。
> 
> **使用方式**：遇到构建异常时，搜索错误关键词，找到对应案例，按解决步骤执行。

---

## 案例索引

| 编号 | 问题 | 严重程度 | 频率 | 状态 |
|------|------|----------|------|------|
| [CASE-001](#case-001-gradle-镜像被重置为官方地址) | Gradle 镜像被重置为官方地址 | high | frequent | resolved |
| [CASE-002](#case-002-使用-clean-命令导致缓存被删除) | 使用 clean 命令导致缓存被删除 | high | frequent | resolved |
| [CASE-003](#case-003-prebuild-后图标被覆盖) | prebuild 后图标被覆盖 | medium | frequent | resolved |
| [CASE-004](#case-004-gradle-反复下载依赖) | Gradle 反复下载依赖 | high | frequent | resolved |
| [CASE-005](#case-005-离线模式构建失败) | 离线模式构建失败 | medium | occasional | resolved |
| [CASE-006](#case-006-wsl-环境变量未设置) | WSL 环境变量未设置 | high | occasional | resolved |
| [CASE-007](#case-007-gradle-版本不兼容) | Gradle 版本不兼容 | medium | rare | resolved |
| [CASE-008](#case-008-构建脚本引号转义问题) | 构建脚本引号转义问题 | medium | occasional | resolved |
| [CASE-009](#case-009-代码目录与构建目录不同步) | 代码目录与构建目录不同步 | high | occasional | resolved |
| [CASE-010](#case-010-文件被占用导致prebuild失败) | 文件被占用导致 prebuild 失败 | medium | occasional | new |
| [CASE-011](#case-011-违规使用eas构建) | 违规使用 EAS 构建（必须使用 WSL） | critical | rare | new |
| [CASE-012](#case-012-单wsl串行构建缓存冲突) | 单 WSL 串行构建缓存冲突（已通过双 WSL 解决） | high | frequent | resolved |
| [CASE-013](#case-013-appconfigjs-esm兼容性错误) | app.config.js ESM 兼容性错误 | high | occasional | resolved |
| [CASE-014](#case-014-expo-build-properties覆盖usesCleartextTraffic) | expo-build-properties 覆盖 usesCleartextTraffic | critical | occasional | resolved |
| [CASE-015](#case-015-登录页面第三方登录按钮不显示) | 登录页面第三方登录按钮不显示 | high | occasional | resolved |
| [CASE-016](#case-016-绕过-build-apkps1-统一入口直接调用-wsl-构建) | 绕过 build-apk.ps1 统一入口直接调用 WSL 构建 | critical | rare | new |
| [CASE-017](#case-017-react-native-svg-依赖缺失导致构建失败) | react-native-svg 依赖缺失导致构建失败 | high | occasional | new |
| [CASE-018](#case-018-constantsexpoconfig-未就绪导致市场判断错误) | Constants.expoConfig 未就绪导致市场判断错误 | critical | frequent | new |
| [CASE-019](#case-019-国内版-api-url-使用-ip-地址导致-nginx-403) | 国内版 API URL 使用 IP 地址导致 nginx 403 | critical | occasional | new |
| [CASE-020](#case-020-windows-文件锁定导致-gradle-构建目录删除失败) | Windows 文件锁定导致 Gradle 构建目录删除失败 | medium | occasional | new |
| [CASE-021](#case-021-metro-未内联-json-翻译文件导致 i18n-显示键名) | Metro 未内联 JSON 翻译文件，i18n 显示键名 | critical | rare | new |
| [CASE-022](#case-022-首次构建-buildgradlesh-清理逻辑失效导致-transforms-缓存污染) | 首次构建时 build-gradle.sh 清理逻辑失效，transforms 缓存污染 | high | occasional | new |

---

## CASE-001: Gradle 镜像被重置为官方地址

```yaml
---
id: CASE-001
category: apk-build
severity: high
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

构建时 Gradle 从官方地址下载，速度极慢或超时：

```
Downloading https://services.gradle.org/distributions/gradle-8.8-all.zip
... 超时/失败
```

### 根因

`npx expo prebuild --platform android` 会重新生成 `gradle-wrapper.properties`，将 `distributionUrl` 重置为官方地址 `https://services.gradle.org/distributions/gradle-8.8-all.zip`。

### 解决

**步骤 1**：检查当前镜像地址
```bash
cat project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl
```

**步骤 2**：如果被重置，恢复为国内镜像
```bash
# 使用腾讯云镜像
sed -i 's|https://services.gradle.org/distributions/|https://mirrors.cloud.tencent.com/gradle/|g' \
  project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
```

**步骤 3**：验证修改
```bash
cat project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl
# 应输出：distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.8-all.zip
```

### 预防

1. **prebuild 后自动检查**：将镜像恢复加入 prebuild 后的标准流程
2. **使用脚本构建**：通过 `build-gradle.sh` 脚本构建，脚本内自动验证镜像
3. **定期验证**：每周检查一次 `gradle-wrapper.properties`

### 相关

- CASE-004: Gradle 反复下载依赖（镜像问题导致）

---

## CASE-002: 使用 clean 命令导致缓存被删除

```yaml
---
id: CASE-002
category: apk-build
severity: high
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

执行 `./gradlew clean assembleRelease` 后，下次构建需要重新下载所有依赖，耗时 10+ 分钟。

### 根因

`clean` 任务会删除 `build/` 目录和构建缓存，但不会删除已下载的 Gradle 发行包和 Maven 依赖。然而，如果配合 `--no-configuration-cache`，配置缓存也会被清除，导致重新解析依赖。

### 解决

**避免使用 clean**：

```bash
# ❌ 错误：会清除缓存
./gradlew clean assembleRelease --no-daemon

# ✅ 正确：保留缓存，增量构建
./gradlew assembleRelease --no-daemon --no-configuration-cache
```

**如果必须 clean**（如项目配置大幅变更）：
```bash
# 仅清理项目构建产物，保留全局缓存
./gradlew clean --no-daemon
# 然后正常构建
./gradlew assembleRelease --no-daemon --no-configuration-cache
```

### 预防

1. **规则禁止**：在规则中明确禁止 `clean` 命令
2. **脚本封装**：构建脚本中不包含 `clean` 步骤
3. **缓存监控**：定期检查缓存目录大小，确认缓存有效

```bash
# 检查缓存目录
du -sh /home/mayn/.gradle/wrapper/dists/
du -sh /home/mayn/.m2/repository/
```

### 相关

- CASE-004: Gradle 反复下载依赖（缓存被删除导致）

---

## CASE-003: prebuild 后图标被覆盖

```yaml
---
id: CASE-003
category: apk-build
severity: medium
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

执行 `npx expo prebuild --platform android` 后，之前修复的 Android 图标被重置为默认图标。

### 根因

prebuild 根据 `app.json` 中的 `icon` 和 `adaptiveIcon` 配置重新生成 `res/mipmap-*/` 目录下的图标文件，覆盖手动修复的图标。

### 解决

**步骤 1**：prebuild 后立即恢复图标
```bash
for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    cp project/assets/icons/android/mipmap-${dir}/ic_launcher.png \
       project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher.png
    cp project/assets/icons/android/mipmap-${dir}/ic_launcher.png \
       project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher_round.png
done

for dir in hdpi mdpi xhdpi xxhdpi xxxhdpi; do
    cp project/assets/icons/android/ic_launcher_foreground.png \
       project/apps/mobile/android/app/src/main/res/mipmap-${dir}/ic_launcher_foreground.png
done
```

**步骤 2**：验证图标已恢复
```bash
ls -la project/apps/mobile/android/app/src/main/res/mipmap-xhdpi/
```

### 预防

1. **长期方案**：修改 `apps/mobile/assets/icon.png` 和 `apps/mobile/assets/adaptive-icon.png` 为正确版本
2. **脚本自动化**：将图标恢复加入 prebuild 后的标准流程
3. **Git 追踪**：将修复后的图标文件加入 Git 版本控制

### 相关

- CASE-001: prebuild 同时会重置 Gradle 镜像

---

## CASE-004: Gradle 反复下载依赖

```yaml
---
id: CASE-004
category: apk-build
severity: high
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

每次构建都重新下载 Gradle 发行包或 Maven 依赖，即使之前已成功构建。

### 根因

1. **镜像配置失效**：`gradle-wrapper.properties` 被重置为官方地址
2. **缓存未启用**：`gradle.properties` 中未启用 `org.gradle.caching=true`
3. **clean 命令**：使用了 `clean` 任务删除缓存
4. **WSL 路径问题**：Windows 和 WSL 路径不一致导致缓存位置混乱

### 解决

**步骤 1**：检查并修复镜像配置
```bash
# 检查 Gradle Wrapper 镜像
cat project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl

# 检查 Maven 仓库镜像
cat project/apps/mobile/android/build.gradle | grep -A 5 "repositories"
```

**步骤 2**：启用缓存
```bash
cat project/apps/mobile/android/gradle.properties | grep "org.gradle.caching"
# 应输出：org.gradle.caching=true
```

**步骤 3**：检查缓存目录
```bash
# WSL 内检查
ls -la /home/mayn/.gradle/wrapper/dists/
ls -la /home/mayn/.m2/repository/
```

**步骤 4**：如果缓存为空，手动下载并放置
```bash
# 在 WSL 内执行首次构建，确保依赖被缓存
wsl -d linkchest-global -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android && ./gradlew assembleRelease --no-daemon --no-configuration-cache"
```

### 预防

1. **镜像锁定**：prebuild 后自动恢复镜像配置
2. **缓存启用**：确保 `gradle.properties` 中 `org.gradle.caching=true`
3. **禁止 clean**：规则中禁止使用 `clean` 命令
4. **缓存监控**：定期检查缓存目录

### 相关

- CASE-001: Gradle 镜像被重置
- CASE-002: 使用 clean 命令

---

## CASE-005: 离线模式构建失败

```yaml
---
id: CASE-005
category: apk-build
severity: medium
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

使用 `--offline` 参数构建时失败：

```
No cached version available for offline mode
```

### 根因

prebuild 重新生成 Android 项目后，依赖配置可能变化，新增或变更的依赖在本地缓存中不存在，离线模式无法下载。

### 解决

**移除 --offline 参数**：

```bash
# ❌ 错误：离线模式可能导致失败
./gradlew assembleRelease --no-daemon --offline

# ✅ 正确：使用国内镜像，允许联网下载
./gradlew assembleRelease --no-daemon --no-configuration-cache
```

**如果必须使用离线模式**（确认所有依赖已缓存）：
```bash
# 先执行一次在线构建，确保所有依赖缓存
./gradlew assembleRelease --no-daemon --no-configuration-cache

# 后续构建可使用离线模式
./gradlew assembleRelease --no-daemon --offline
```

### 预防

1. **默认不使用离线模式**：规则中不推荐 `--offline`
2. **国内镜像足够快**：腾讯云 + 阿里云镜像已能满足速度需求
3. **缓存验证**：使用离线模式前，先验证缓存完整性

### 相关

- CASE-004: Gradle 反复下载依赖

---

## CASE-006: WSL 环境变量未设置

```yaml
---
id: CASE-006
category: apk-build
severity: high
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

构建时提示找不到 Java 或 Android SDK：

```
ERROR: JAVA_HOME is not set and no 'java' command could be found
# 或
SDK location not found. Define location with sdk.dir in the local.properties file
```

### 根因

WSL 会话中未设置 `JAVA_HOME` 和 `ANDROID_HOME` 环境变量，或 `local.properties` 文件缺失。

### 解决

**步骤 1**：设置环境变量
```bash
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0:$JAVA_HOME/bin:$PATH
```

**步骤 2**：创建 local.properties（如果不存在）
```bash
echo "sdk.dir=/opt/android-sdk" > project/apps/mobile/android/local.properties
```

**步骤 3**：验证环境
```bash
java -version
adb --version
```

### 预防

1. **.bashrc 配置**：将环境变量加入 `~/.bashrc`
2. **构建脚本**：脚本内自动设置环境变量
3. **环境检查**：构建前验证环境变量

### 相关

- CASE-008: 构建脚本引号转义问题（环境变量设置相关）

---

## CASE-007: Gradle 版本不兼容

```yaml
---
id: CASE-007
category: apk-build
severity: medium
frequency: rare
first_seen: "2026-05-10"
last_seen: "2026-05-10"
status: resolved
---
```

### 现象

构建时提示 Gradle 版本不兼容：

```
Minimum supported Gradle version is 8.8. Current version is 8.5.
```

### 根因

`gradle-wrapper.properties` 中的 Gradle 版本与项目要求的版本不一致。

### 解决

**更新 Gradle Wrapper 版本**：
```bash
# 修改 gradle-wrapper.properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.8-all.zip

# 或者使用 Gradle 命令更新
./gradlew wrapper --gradle-version 8.8
```

### 预防

1. **版本锁定**：项目文档中明确 Gradle 版本
2. **prebuild 后检查**：prebuild 后验证 Gradle 版本
3. **统一配置**：所有开发者使用相同的 Gradle 版本

### 相关

- CASE-001: Gradle 镜像被重置

---

## CASE-008: 构建脚本引号转义问题

```yaml
---
id: CASE-008
category: apk-build
severity: medium
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

通过 PowerShell 执行 WSL 命令时，引号转义错误：

```
bash: -c: line 1: unexpected EOF while looking for matching `"'
```

### 根因

PowerShell 和 bash 的引号转义规则不同，复杂命令在 PowerShell 中难以正确传递。

### 解决

**使用独立脚本文件**：

创建 `apps/mobile/build-gradle.sh`：
```bash
#!/bin/bash
set -e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH

echo "=== Starting Gradle assembleRelease ==="
./gradlew assembleRelease --no-daemon --no-configuration-cache

echo "=== Build completed ==="
echo "APK location: app/build/outputs/apk/release/app-release.apk"
```

执行：
```bash
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

### 预防

1. **脚本文件优先**：复杂命令使用脚本文件，避免命令行转义
2. **简单命令行**：简单命令可直接使用，复杂命令必须脚本化
3. **测试脚本**：新脚本先在 WSL 内测试，确认无误后再集成

### 相关

- CASE-006: WSL 环境变量未设置

---

## CASE-009: 代码目录与构建目录不同步

```yaml
---
id: CASE-009
category: apk-build
severity: high
frequency: occasional
first_seen: "2026-05-16"
last_seen: "2026-05-16"
status: resolved
---
```

### 现象

APK 构建成功，但安装后发现功能未更新，仍是旧版本。检查 APK 时间戳发现是构建前的旧文件：

```
-rwxrwxrwx 1 mayn mayn 72M May 16 00:44 app-release.apk
# 而代码改动是在 00:44 之后进行的
```

Gradle 构建日志中大量任务显示 `UP-TO-DATE`，未触发 `createBundleReleaseJsAndAssets`（JS 重新打包）。

### 根因

项目存在两个代码目录：

| 目录 | 用途 | 说明 |
|------|------|------|
| `apps/mobile/` | 开发编辑目录 | TRAE 编辑器修改的文件在这里 |
| `project/apps/mobile/` | 构建目录 | WSL 构建脚本从这里读取代码 |

**代码修改在 `apps/mobile/`，但构建脚本运行在 `project/apps/mobile/`**。如果修改后未同步，Gradle 检测不到源码变化，直接使用缓存，打包的还是旧 JS bundle。

### 解决

**步骤 1**：确认两个目录的差异
```bash
# 检查新文件是否存在于构建目录
ls project/apps/mobile/src/screens/ManagementScreen.tsx
# 如果不存在，说明未同步

# 对比两个目录的文件列表
diff <(ls apps/mobile/src/screens/) <(ls project/apps/mobile/src/screens/)
```

**步骤 2**：同步修改的文件到构建目录
```bash
# 使用同步脚本（推荐）
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/apps/mobile/sync-to-project.sh

# 或手动同步单个文件
cp apps/mobile/src/screens/ManagementScreen.tsx project/apps/mobile/src/screens/
cp apps/mobile/src/navigation/MainTabNavigator.tsx project/apps/mobile/src/navigation/
cp apps/mobile/App.tsx project/apps/mobile/
# ... 其他修改的文件
```

**步骤 3**：重新构建，验证 JS 重新打包
```bash
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
# 构建日志中应出现：
# > Task :app:createBundleReleaseJsAndAssets
# Starting Metro Bundler
# warning: Bundler cache is empty, rebuilding (this may take a minute)
```

**步骤 4**：验证 APK 时间戳已更新
```bash
ls -la project/apps/mobile/android/app/build/outputs/apk/release/app-release.apk
# 时间戳应为构建时间，而非旧时间
```

### 预防

1. **构建前必同步**：每次构建前执行 `sync-to-project.sh`，确保代码一致
2. **验证 JS 打包**：构建日志中必须出现 `createBundleReleaseJsAndAssets`，否则说明代码未更新
3. **检查 APK 时间戳**：构建完成后确认 APK 时间戳是当前时间
4. **统一目录**：长期方案是将开发目录和构建目录统一，避免双目录问题

### 同步脚本参考

`apps/mobile/sync-to-project.sh`：
```bash
#!/bin/bash
set -e
SRC=/mnt/d/trae_projects/linkchest/apps/mobile
DST=/mnt/d/trae_projects/linkchest/project/apps/mobile

# 同步所有源码文件
cp "$SRC/App.tsx" "$DST/App.tsx"
cp -r "$SRC/src/" "$DST/src/"

echo "=== Sync complete ==="
```

### 相关

- CASE-008: 构建脚本引号转义问题（同步脚本也需注意 PowerShell 转义）

---

## CASE-010: 文件被占用导致 prebuild 失败

```yaml
---
id: CASE-010
category: apk-build
severity: medium
frequency: occasional
first_seen: "2026-05-17"
last_seen: "2026-05-17"
status: new
---
```

### 现象

执行 `npx expo prebuild` 时报错：

```
× Failed to delete android code: EBUSY: resource busy or locked,
  rmdir 'D:\trae_projects\linkchest\project\apps\mobile\android\app\build\outputs\apk\release'
Error: EBUSY: resource busy or locked, rmdir '...'
```

### 根因

1. 之前的构建产物（APK 文件）被其他进程占用（如文件管理器、ADB、杀毒软件）
2. 或者之前的构建进程未完全退出，仍在占用构建目录

### 解决

**步骤 1**：关闭占用进程
```bash
# 查找占用该目录的进程（Windows）
# 使用资源监视器或 Process Explorer 查找句柄

# 或重启终端/IDE 释放占用
```

**步骤 2**：手动删除被占用的文件
```powershell
# PowerShell 强制删除
Remove-Item -Recurse -Force D:\trae_projects\linkchest\project\apps\mobile\android\app\build\outputs\apk\release\app-release.apk

# 然后删除目录
Remove-Item -Recurse -Force D:\trae_projects\linkchest\project\apps\mobile\android\app\build\outputs\apk\release
```

**步骤 3**：重新执行 prebuild（不带 --clean）
```bash
cd project/apps/mobile
npx expo prebuild --platform android
# 注意：不要使用 --clean 参数！
```

### 预防

1. **构建前关闭文件管理器**：避免文件管理器打开构建输出目录
2. **避免重复执行 prebuild**：一次 prebuild 后，除非必要，不要重复执行
3. **使用 WSL 构建**：WSL 内文件系统不受 Windows 进程占用影响
4. **不要手动操作构建目录**：让 Gradle 脚本管理构建产物

### 相关

- CASE-002: 使用 clean 命令导致缓存被删除（--clean 同样危险）

---

## CASE-011: 违规使用 EAS 构建

```yaml
---
id: CASE-011
category: apk-build
severity: critical
frequency: rare
first_seen: "2026-05-17"
last_seen: "2026-05-17"
status: new
---
```

### 现象

SOLO Agent 尝试使用 EAS (Expo Application Services) 构建：

```
EAS 构建需要 Expo 账号登录...
服务器上没有 eas-cli...
```

然后尝试在 Windows 本地执行：
```bash
npx expo prebuild --platform android --clean
```

导致：
1. EAS 构建不可用（服务器未安装 eas-cli）
2. `--clean` 参数删除了 Android 项目配置
3. 在 Windows 本地构建违反 WSL 强制要求

### 根因

1. **未阅读 BUILD.md 规则**：不知道必须使用 WSL 构建
2. **未识别构建规则加载**：`BUILD.md` 为 `alwaysApply: false`，SOLO Agent 未识别构建场景；构建红线由 `BUILD_RED_LINES.md`（alwaysApply: false，构建时自动加载）兜底保护
3. **试图使用云构建服务**：EAS 需要 Expo 账号和 eas-cli，项目环境不满足

### 解决

**立即停止当前操作**，按正确流程执行：

**步骤 1**：确认 WSL 环境可用
```bash
wsl -d linkchest-global -u mayn -- echo "WSL OK"
```

**步骤 2**：如果 Android 项目已被 --clean 破坏，重新 prebuild（在 WSL 内）
```bash
wsl -d linkchest-global -u mayn -- bash -c "cd /mnt/d/trae_projects/linkchest/project/apps/mobile && npx expo prebuild --platform android"
```

**步骤 3**：恢复镜像配置（prebuild 可能重置为官方地址）
```bash
# 检查并恢复 Gradle 镜像
sed -i 's|https://services.gradle.org/distributions/|https://mirrors.cloud.tencent.com/gradle/|g' \
  project/apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
```

**步骤 4**：使用 WSL 构建
```bash
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

### 预防

1. **绝对禁止 EAS 构建**：项目不使用 Expo 云服务，所有构建必须在 WSL 本地完成
2. **强制阅读 BUILD.md**：任何构建操作前必须先阅读构建规则
3. **WSL 唯一构建路径**：所有 APK 构建命令必须通过 `wsl -d linkchest-global` 或 `wsl -d linkchest-cn` 执行
4. **禁止 --clean 参数**：prebuild 和 gradlew 都禁止携带 clean 相关参数

### 相关

- CASE-001: Gradle 镜像被重置为官方地址（prebuild 后需恢复）
- CASE-002: 使用 clean 命令导致缓存被删除
- CASE-006: WSL 环境变量未设置

---

## CASE-012: 单WSL串行构建缓存冲突

- **发现时间**：2026-05-21
- **严重程度**：high
- **频率**：frequent（双版本构建时必现）
- **状态**：resolved（通过双 WSL 架构解决）

### 现象

单 WSL 实例串行构建 global 和 china 两个 flavor 时，第二个构建的 APK 配置与第一个相同：
- 国内版 APK 使用海外 API 地址
- 国内版显示 Google/Apple 登录按钮而非微信
- `Constants.expoConfig.extra.market` 读取为旧值

### 根因

1. **Metro 缓存冲突**：Metro Bundler 缓存了第一个 flavor 的 JS bundle，第二个 flavor 构建时复用了缓存
2. **`.env.market` 文件竞争**：两个 flavor 共享同一个 `.env.market` 文件，后写入的值覆盖前一个
3. **expo-constants 缓存**：原生层缓存了 `app.config.js` 的旧值

### 解决方案

**永久方案：双 WSL 架构**

```
linkchest-global → 专构建 global flavor（MARKET=global）
linkchest-cn     → 专构建 china flavor（MARKET=china）
```

- 两个 WSL 实例有独立的 Metro 缓存、Gradle 缓存
- 并行构建互不干扰，总耗时接近单次构建
- 构建脚本自动通过 `WSL_DISTRO_NAME` 检测 flavor

```powershell
# 并行构建（推荐）
.\project\apps\mobile\build-apk.ps1
```

### 预防

1. **禁止单 WSL 串行构建两个 flavor**
2. **双版本构建必须使用并行构建**：`.\project\apps\mobile\build-apk.ps1`
3. **单独构建时使用对应 WSL 实例**

### 相关

- CASE-013: app.config.js ESM 兼容性错误
- CASE-014: expo-build-properties 覆盖 usesCleartextTraffic
- CASE-015: 登录页面第三方登录按钮不显示

---

## CASE-013: app.config.js ESM兼容性错误

- **发现时间**：2026-05-21
- **严重程度**：high
- **频率**：occasional
- **状态**：resolved

### 现象

构建时 Metro 报错：
```
ReferenceError: exports is not defined in ES module scope
```
或
```
ReferenceError: __dirname is not defined in ES module scope
```

### 根因

`app.config.js` 使用了 ESM 语法（`import`/`export default`），但 Metro/Expo 的配置加载器在某些版本下不完全支持 ESM，导致：
- `import.meta.url` 不可用
- `__dirname` 在 ESM 中未定义
- `exports` 对象在 ESM 中不存在

### 解决方案

将 `app.config.js` 改为 CommonJS 格式：

```javascript
// ❌ ESM 格式（可能报错）
import * as fs from 'fs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default { expo: { ... } };

// ✅ CommonJS 格式（稳定）
const fs = require('fs');
const path = require('path');
module.exports = { expo: { ... } };
```

### 预防

1. **app.config.js 必须使用 CommonJS 格式**
2. 使用 `require()` 而非 `import`
3. 使用 `module.exports` 而非 `export default`

---

## CASE-014: expo-build-properties覆盖usesCleartextTraffic

- **发现时间**：2026-05-21
- **严重程度**：critical
- **频率**：occasional
- **状态**：resolved

### 现象

国内版 APK 无法连接服务器（HTTP 请求被拦截），但网页端正常。

### 根因

`app.config.js` 中的 `expo-build-properties` 插件硬编码了 `usesCleartextTraffic: false`：

```javascript
plugins: [
  ['expo-build-properties', {
    android: {
      usesCleartextTraffic: false,  // ❌ 硬编码 false，覆盖了国内版设置
    }
  }]
]
```

即使 `android.usesCleartextTraffic` 设为 `true`，插件也会覆盖为 `false`，导致国内版无法发送 HTTP 请求。

### 解决方案

让 `expo-build-properties` 的 `usesCleartextTraffic` 跟随市场配置：

```javascript
plugins: [
  ['expo-build-properties', {
    android: {
      usesCleartextTraffic: marketValue === 'china',  // ✅ 国内版允许 HTTP
    }
  }]
]
```

### 预防

1. **`expo-build-properties` 中的配置必须与 `android` 字段保持一致**
2. 国内版必须允许 HTTP 明文流量（国内服务器暂无 HTTPS）
3. 修改 `app.config.js` 时，同时检查 `android.usesCleartextTraffic` 和插件配置

---

## CASE-015: 登录页面第三方登录按钮不显示

- **发现时间**：2026-05-21
- **严重程度**：high
- **频率**：occasional
- **状态**：resolved

### 现象

APK 登录页面只显示邮箱/密码登录，没有第三方登录按钮（Google/Apple/微信）。

### 根因

登录页面的第三方登录按钮依赖 `/market/config` API 返回的 `authProviders` 配置。当 APK 无法连接服务器时（如 CASE-014 导致），API 请求失败，`marketConfig` 为 null，所有第三方登录按钮都不显示。

### 解决方案

在 `LoginScreen.tsx` 中添加本地市场配置回退逻辑：

```typescript
// 本地市场判断（API 不可用时的回退）
const localMarket = Constants.expoConfig?.extra?.market as string || 'global';
const isLocalChina = localMarket === 'china' ||
  (Constants.expoConfig?.android?.package || '') === 'cn.linkchest.app';

// 默认市场配置（API 失败时使用）
const defaultMarketConfig: MarketConfig = isLocalChina
  ? { market: 'china', authProviders: { wechat: true, ... }, ... }
  : { market: 'global', authProviders: { google: true, apple: true, ... }, ... };

// 获取市场配置
useEffect(() => {
  async function fetchMarketConfig() {
    try {
      const config = await getMarketConfig();
      setMarketConfig(config);
    } catch (err) {
      // API 不可用时，使用本地默认配置
      setMarketConfig(defaultMarketConfig);
    }
  }
  fetchMarketConfig();
}, []);
```

### 预防

1. **所有依赖 API 的 UI 功能必须有本地回退逻辑**
2. 市场配置应优先使用构建时注入的 `Constants.expoConfig.extra.market`
3. API 请求失败不应导致核心功能（如登录）不可用

---

## CASE-016: 绕过 build-apk.ps1 统一入口直接调用 WSL 构建

```yaml
---
id: CASE-016
category: apk-build
severity: critical
frequency: rare
first_seen: "2026-05-27"
last_seen: "2026-05-27"
status: new
---
```

### 现象

Agent 在构建 APK 时直接调用 WSL 命令：
```bash
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh global
```
而非使用规定的统一入口 `build-apk.ps1`。

### 根因

1. **规则漏洞**：BUILD_RED_LINES.md v3.1 允许"方式2：直接通过 WSL 构建"
2. **紧急处理心态**：用户催促时，Agent 为节省时间绕过统一入口
3. **缺乏强制约束**：规则只有建议，没有技术层面的强制阻断

### 影响

- 绕过 `build-apk.ps1` 的并行构建、日志捕获、错误处理等机制
- 可能导致缓存隔离失效、构建产物不一致
- 违反统一入口原则，增加维护成本

### 解决方案

**立即纠正**：
1. 终止当前直接 WSL 构建进程
2. 使用正确命令重新构建：
   ```powershell
   .\project\apps\mobile\build-apk.ps1 global    # 单版本
   .\project\apps\mobile\build-apk.ps1          # 并行构建两个版本
   ```

**规则修复**（已完成）：
1. BUILD_RED_LINES.md 已更新为 v3.2
2. 删除"方式2：直接通过 WSL 构建"的允许说明
3. 增加 `wsl -d linkchest-*` + `build-gradle` 到阻断关键词
4. 增加"统一入口确认"到强制检查清单
5. 增加绕过统一入口的专项处理流程

### 预防措施

1. **规则层面**：BUILD_RED_LINES.md v3.2 明确禁止直接 WSL 调用
2. **技术层面**：build-apk.ps1 已集成所有必要功能（并行、隔离、日志）
3. **流程层面**：即使紧急处理，也必须使用 `build-apk.ps1`
4. **监控层面**：每次构建后检查是否通过统一入口执行

## CASE-017: react-native-svg 依赖缺失导致构建失败

```yaml
---
id: CASE-017
category: apk-build
severity: high
frequency: occasional
first_seen: "2026-05-31"
last_seen: "2026-05-31"
status: new
---
```

### 现象

构建时 Metro Bundler 报错：

```
error: Error: Unable to resolve module react-native-svg from /mnt/d/trae_projects/linkchest/project/apps/mobile/src/components/WeChatIcon.tsx: react-native-svg could not be found within the project or in these directories:
  node_modules
  ../../../node_modules
```

### 根因

**创建自定义 SVG 组件时未安装 `react-native-svg` 依赖。**

项目使用了自定义 `WeChatIcon.tsx` 组件，通过 `react-native-svg` 库渲染 SVG 图标：

```tsx
import Svg, { Path } from 'react-native-svg';
```

但 `react-native-svg` 不在 `package.json` 的依赖列表中，Metro 打包时找不到该模块。

### 解决

**步骤 1：安装依赖**

```bash
cd project/apps/mobile
npx expo install react-native-svg
```

`expo install` 会自动选择与当前 Expo SDK 兼容的版本。

**步骤 2：重新构建**

```bash
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china
```

### 预防

1. **引入新组件前检查依赖**：使用第三方库前，先确认是否已安装对应依赖
2. **IDE 自动检测**：VS Code 等 IDE 会在 import 语句处标红未安装的包
3. **构建前预检**：在构建脚本中添加 `npm ls react-native-svg` 检查

### 相关

- CASE-015: 登录页面第三方登录按钮不显示（WeChatIcon 使用场景）

---

## CASE-018: Constants.expoConfig 未就绪导致市场判断错误

```yaml
---
id: CASE-018
category: apk-build
severity: critical
frequency: frequent
first_seen: "2026-05-31"
last_seen: "2026-05-31"
status: new
---
```

### 现象

APK 安装后表现为：
- 国内版 APK 显示 Google/Apple 登录按钮（应为微信）
- 默认语言为英文（应为中文）
- API 请求指向海外服务器 `https://linkchest.net/api`
- 客服邮箱显示 `support@linkchest.net`（应为 `.cn`）

### 根因

**`market.ts` 中的 `_cachedMarket` 在 `Constants.expoConfig` 未就绪时被错误缓存为 `global`。**

```typescript
// market.ts
function _detectMarket(): 'china' | 'global' {
  if (_cachedMarket) return _cachedMarket;  // ❌ 一旦缓存，不再重新检测
  
  const pkg = Constants.expoConfig?.android?.package;
  if (pkg === 'cn.linkchest.app') {
    _cachedMarket = 'china';
    return 'china';
  }
  // ...
  _cachedMarket = 'global';  // ❌ Constants 未就绪时也会缓存
  return 'global';
}
```

模块加载时（如 `api.ts` 导入 `isChinaMarket()`），`Constants.expoConfig` 可能为 `null`，`_cachedMarket` 被设为 `global`。之后即使 `Constants.expoConfig` 就绪，也不会重新检测。

**影响范围：**

| 文件 | 模块加载时计算的值 | 后果 |
|------|-------------------|------|
| `api.ts` | `getDefaultApiUrl()` | API 指向海外服务器 |
| `i18n.tsx` | `initialLocale` | 默认语言为英文 |
| `locales/*.json` | 硬编码邮箱 | 显示 `.net` 邮箱 |

### 解决

**步骤 1：修改 `_detectMarket()`，未就绪时不缓存**

```typescript
function _detectMarket(): 'china' | 'global' {
  if (_cachedMarket) return _cachedMarket;

  const expoConfig = Constants.expoConfig;
  
  // ✅ 如果 Constants.expoConfig 还没准备好，返回 global 但不缓存
  if (!expoConfig) {
    console.log('[market.ts] Constants.expoConfig 未就绪，返回 global (不缓存)');
    return 'global';
  }

  // 正常检测逻辑...
}
```

**步骤 2：将模块级常量改为运行时函数**

```typescript
// ❌ 模块加载时计算，可能时机不对
export const DEFAULT_API_URL = getDefaultApiUrl();

// ✅ 运行时计算
export function getDefaultApiUrl(): string {
  return isChinaMarket()
    ? 'https://linkchest.cn/api'
    : 'https://linkchest.net/api';
}
```

**步骤 3：在 `initApiUrl()` 中重新验证并修正**

```typescript
export async function initApiUrl(): Promise<void> {
  const defaultUrl = getDefaultApiUrl();
  currentBaseUrl = defaultUrl;
  api.defaults.baseURL = defaultUrl;
}
```

### 预防

1. **延迟计算原则**：依赖 `Constants.expoConfig` 的值必须在运行时计算，不在模块加载时计算
2. **缓存安全**：只有在确认数据源就绪后才缓存结果
3. **双重验证**：模块加载时给一个默认值，应用启动后再验证并修正
4. **构建产物检查**：构建后反编译 bundle，确认 `market` 和 `package` 配置正确

### 相关

- CASE-012: 单 WSL 串行构建缓存冲突（类似的缓存问题）
- CASE-015: 登录页面第三方登录按钮不显示（市场判断错误的后果）

---

## CASE-019: 国内版 API URL 使用 IP 地址导致 nginx 403

```yaml
---
id: CASE-019
category: apk-build
severity: critical
frequency: occasional
first_seen: "2026-05-31"
last_seen: "2026-05-31"
status: new
---
```

### 现象

国内版 APK 安装后，所有 API 请求返回 "连接服务器异常"。但：
- `https://linkchest.cn/api/health` 浏览器访问正常（200）
- `http://43.136.82.88/api/health` 返回 403 Forbidden
- 海外版 APK 连接正常

### 根因

**国内版 API URL 使用了服务器 IP 地址而非域名，触发 nginx 默认拒绝规则。**

```typescript
// ❌ 错误配置
const chinaUrl = 'http://43.136.82.88/api';  // 返回 403

// ✅ 正确配置
const chinaUrl = 'https://linkchest.cn/api';  // 返回 200
```

nginx 配置中有一个默认 server 块：

```nginx
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    return 403;  # 所有不匹配域名的请求返回 403
}
```

只有通过 `server_name linkchest.cn` 的请求才会被代理到后端服务。

### 解决

**步骤 1：修改 `api.ts` 中的国内版 URL**

```typescript
export function getDefaultApiUrl(): string {
  return isChinaMarket()
    ? 'https://linkchest.cn/api'   // ✅ 使用域名
    : 'https://linkchest.net/api';
}
```

**步骤 2：更新 URL 匹配验证逻辑**

```typescript
// 验证保存的 URL 是否与当前市场匹配
const isSavedChina = savedUrl.includes('linkchest.cn');  // ✅ 改为域名匹配
const isSavedGlobal = savedUrl.includes('linkchest.net');
```

**步骤 3：重新构建并测试**

```bash
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china
```

### 预防

1. **API URL 使用域名而非 IP**：域名更稳定，且不受 nginx server_name 限制
2. **部署前验证**：构建后通过 curl 验证 API 端点可访问
3. **环境配置分离**：国内/海外使用独立的域名配置，避免混用
4. **nginx 配置文档化**：记录 nginx server_name 限制，避免直接使用 IP

### 相关

- CASE-014: expo-build-properties 覆盖 usesCleartextTraffic（国内版网络配置）
- CASE-015: 登录页面第三方登录按钮不显示（API 连接失败的后果）

---

## CASE-020: Windows 文件锁定导致 Gradle 构建目录删除失败

```yaml
---
id: CASE-020
category: apk-build
severity: medium
frequency: occasional
first_seen: "2026-05-31"
last_seen: "2026-05-31"
status: new
---
```

### 现象

Gradle 构建时报错：

```
Unable to delete directory 'D:\trae_projects\linkchest\project\apps\mobile\android\app\build'
  Failed to delete some children. This might happen because a process has files open or has its working directory set to the target directory.
```

### 根因

**Windows 进程占用了 Gradle 构建输出目录**，导致 Gradle 无法清理旧构建产物。常见原因：
1. 文件管理器打开了 `build/outputs/apk/` 目录
2. ADB 或其他工具正在访问 APK 文件
3. 之前的 Gradle daemon 未完全退出

### 解决

**方案 A：修改 Gradle 构建目录（推荐）**

在 `android/app/build.gradle` 中修改构建输出目录：

```gradle
android {
    // ...
    applicationVariants.all { variant ->
        variant.outputs.all {
            outputFileName = "linkchest-${variant.flavorName}-${new Date().format('yyyyMMddHHmm')}.apk"
        }
    }
}

// 修改构建目录，避开被锁定的路径
project.buildDir = "${rootProject.buildDir}/build-fresh"
```

**方案 B：关闭占用进程**

1. 关闭文件管理器中打开的构建目录
2. 断开 ADB 连接：`adb disconnect`
3. 结束 Gradle daemon：`./gradlew --stop`

**方案 C：重启后构建**

如果无法定位占用进程，重启电脑后构建。

### 预防

1. **修改默认构建目录**：使用 `build-fresh` 等非默认目录名
2. **构建前关闭文件管理器**：避免打开构建输出目录
3. **使用脚本自动构建**：减少手动操作导致的文件占用
4. **Gradle daemon 管理**：定期执行 `./gradlew --stop` 清理 daemon

### 相关

- CASE-010: 文件被占用导致 prebuild 失败（类似的文件锁定问题）
- CASE-002: 使用 clean 命令导致缓存被删除（clean 与文件锁定的冲突）

## CASE-022: 首次构建时 build-gradle.sh 清理逻辑失效，导致 transforms 缓存污染

```yaml
---
id: CASE-022
category: apk-build
severity: high
frequency: occasional
first_seen: "2026-06-10"
last_seen: "2026-06-10"
status: new
---
```

### 现象

Gradle 构建 4 秒内失败，错误信息：

```
FAILURE: Build failed with an exception.

* Where:
Settings file 'apps/mobile/android/settings.gradle' line: 13

* What went wrong:
Error resolving plugin [id: 'com.facebook.react.settings']
> Multiple build operations failed.
      Could not read workspace metadata from /home/mayn/.gradle/caches/8.8/transforms/5eef628ac9c64d3f5bccf661eeecceb6/metadata.bin
      Could not read workspace metadata from /home/mayn/.gradle/caches/8.8/transforms/4ffbe969f5d4dcce50865e6926a88cca/metadata.bin

BUILD FAILED in 4s
```

特征：
- 失败耗时极短（4 秒），说明 Gradle 在 **Configure 阶段**就崩了，没进入实际编译
- 错误指向 `metadata.bin` 读取失败（文件存在但读不到）
- 涉及 WSL 的 `~/.gradle/caches/8.8/transforms/` 目录

### 根因

`build-gradle.sh:261` 的 transforms 缓存清理逻辑：

```bash
find "$GRADLE_USER_HOME/caches" -path "*/transforms*" -name "*.bin" -newer "$BUILD_DIR" -delete
```

问题点：

1. **`find -newer` 要求目标文件比参考文件新**：当目标文件 mtime **早于** 参考文件时，`-delete` 不生效
2. **首次构建时 `$BUILD_DIR`（如 `build-china`）不存在**：`find -newer` 参考一个不存在的文件时，**所有 transforms/*.bin 都不会被删除**
3. **损坏 metadata.bin 残留**：之前 root 身份构建留下的 inode 污染（`/root/.gradle/...` 通过 WSL2 `/mnt/d` inode 缓存影响 `/home/mayn/.gradle/...`），导致新构建无法读取 transforms 元数据

### 解决

**方案 A（推荐）：仅清理损坏的 transforms 缓存**

```bash
wsl -d linkchest-cn -u mayn -- rm -rf /home/mayn/.gradle/caches/8.8/transforms/*
```

只重生成 metadata.bin，Maven 依赖（`.m2/repository/`）和 Gradle 发行包（`.gradle/wrapper/dists/`）均保留。下次构建从国内镜像重下缺失的依赖（~3-5 分钟）。

**方案 B（兜底）：清空整个 Gradle 缓存重建**

```bash
wsl -d linkchest-cn -u mayn -- rm -rf /home/mayn/.gradle/caches/*
```

下次构建会重下 Gradle 发行包和所有依赖（~10-15 分钟首次构建）。⚠️ **不删 `.m2/repository/`**（Maven 依赖缓存独立于 Gradle caches）。

**验证修复**：

```bash
# 重新构建，应该通过 Configure 阶段
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china
```

### 预防

1. **修改 [build-gradle.sh:261](file:///d:/trae_projects/linkchest/project/apps/mobile/build-gradle.sh#L261) 清理逻辑**，让首次构建也能清理：

   ```bash
   # 修改前（仅 BUILD_DIR 存在时有效）
   find "$GRADLE_USER_HOME/caches" -path "*/transforms*" -name "*.bin" -newer "$BUILD_DIR" -delete

   # 修改后（兜底：BUILD_DIR 不存在时也清理 metadata.bin）
   if [ -d "$BUILD_DIR" ]; then
       find "$GRADLE_USER_HOME/caches" -path "*/transforms*" -name "*.bin" -newer "$BUILD_DIR" -delete
   else
       log_text "WARN" "BUILD_DIR 不存在，跳过 -newer 过滤，清理全部 metadata.bin"
       find "$GRADLE_USER_HOME/caches" -path "*/transforms*" -name "metadata.bin" -delete
   fi
   ```

2. **添加 metadata.bin 读取失败的自动重试**：在 `build-gradle.sh` 主流程中检测 `Could not read workspace metadata` 关键词，自动触发 transforms 清理后重试：

   ```bash
   if grep -q "Could not read workspace metadata" "$BUILD_LOG"; then
       log_json "WARN" "build" "auto-fix" "Detected corrupted metadata.bin, auto-cleaning"
       rm -rf "$GRADLE_USER_HOME/caches/8.8/transforms"/*/metadata.bin
       # 提示用户重试，不自动重试（避免死循环）
   fi
   ```

3. **保持双 WSL 实例隔离**：linkchest-global 和 linkchest-cn 各用各的 `~/.gradle`，避免 root 身份构建污染 mayn 用户缓存

4. **构建前预检**：在 `build-gradle.sh` 头部加一段 sanity check：

   ```bash
   if [ -d "$GRADLE_USER_HOME/caches/8.8/transforms" ]; then
       broken=$(find "$GRADLE_USER_HOME/caches/8.8/transforms" -name "metadata.bin" -readable 2>/dev/null | wc -l)
       total=$(find "$GRADLE_USER_HOME/caches/8.8/transforms" -name "metadata.bin" 2>/dev/null | wc -l)
       if [ "$broken" -lt "$((total / 2))" ]; then
           log_text "WARN" "检测到 $((total - broken)) 个 metadata.bin 不可读，建议清空 transforms 缓存"
       fi
   fi
   ```

### 相关

- [CASE-002](file:///d:/trae_projects/linkchest/.trae/rules/cases/apk-build-errors.md#case-002-使用-clean-命令导致缓存被删除): 使用 clean 命令导致缓存被删除（过度清理的反面案例）
- [CASE-012](file:///d:/trae_projects/linkchest/.trae/rules/cases/apk-build-errors.md#case-012-单wsl串行构建缓存冲突): 单 WSL 串行构建缓存冲突（缓存隔离相关的姊妹案例）
- [CASE-020](file:///d:/trae_projects/linkchest/.trae/rules/cases/apk-build-errors.md#case-020-windows-文件锁定导致-gradle-构建目录删除失败): Windows 文件锁定导致 Gradle 构建目录删除失败（症状相似但根因不同）

---

## CASE-021: Metro 未内联 JSON 翻译文件导致 i18n 显示键名

```yaml
---
id: CASE-021
category: apk-build
severity: critical
frequency: rare
first_seen: "2026-06-01"
last_seen: "2026-06-01"
status: new
---
```

### 现象

APK 构建成功，但运行时发现：
- 套餐名显示为键名：`tier.pro`、`tier.super`（应为 `Pro`、`Ultimate`）
- 其他 i18n 翻译键也可能显示为原始键名而非翻译文本
- 英文和中文环境都受影响

**关键验证：** 反编译 bundle 文件发现 `require('./locales/en.json')` 未被内联，JSON 内容未出现在 JS bundle 中。

```bash
strings index.android.bundle | grep -c '"pro":"Pro"'
# 输出: 0  （说明翻译内容未进入 bundle）
```

### 根因

**Expo 默认 Metro 配置将 `.json` 文件视为 `asset`（静态资源），而非 `source`（源代码）。**

Metro 的 `resolver` 有两个关键配置：
- `sourceExts`：被视为源代码的扩展名，会被内联到 bundle 中
- `assetExts`：被视为静态资源的扩展名，`require()` 返回资源引用 URI

Expo 默认配置中：
```js
// 默认 assetExts 包含 'json'
config.resolver.assetExts = ['png', 'jpg', 'json', ...];
// 默认 sourceExts 不包含 'json'
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'cjs', ...];
```

这导致：
```js
// i18n.tsx 中的翻译加载代码
raw = require('./locales/en.json');
```

在打包后**不会**把 JSON 内容内联进 bundle。运行时 `require()` 返回一个资源引用，而非解析后的 JS 对象。`loadTranslationSync()` 函数执行失败（或返回空对象），`t('tier.pro')` 找不到对应翻译，最终 fallback 回 key 本身。

**为什么之前没发现？**
- 早期的翻译文件可能是硬编码在 JS 代码中，而非通过 `require('./xxx.json')` 加载
- 或者之前的 bundle 中碰巧包含了旧版本的 JSON 缓存

### 解决

**修改 [metro.config.js](file:///d:/trae_projects/linkchest/project/apps/mobile/metro.config.js)，将 `json` 从 `assetExts` 移除并加入 `sourceExts`：**

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// ... 其他配置 ...

// 确保 .json 文件被 Metro 当作源代码内联到 bundle 中
// 默认 Expo 配置将 json 放在 assetExts 中，require() 返回资源 URI
// 我们需要把它移到 sourceExts，让 require() 返回解析后的 JS 对象
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'cjs', 'json'])];
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'json');

module.exports = config;
```

**验证修复：**

```bash
# 构建后检查 bundle 中是否包含翻译内容
strings index.android.bundle | grep -c '"pro":"Pro"'
# 输出应 > 0

strings index.android.bundle | grep -c '"tierManagement":"Plan Management"'
# 输出应 > 0
```

### 预防

1. **metro.config.js 必须显式配置 json 为 source**：任何使用 `require('./xxx.json')` 加载翻译文件的项目，都必须在 `metro.config.js` 中处理
2. **构建后验证 i18n 内容**：在构建脚本中加入 bundle 内容检查：
   ```bash
   # build-gradle.sh 构建后验证
   BUNDLE="android/app/build/generated/assets/createBundle*ReleaseJsAndAssets/index.android.bundle"
   if ! strings $BUNDLE | grep -q '"pro":"Pro"'; then
     echo "❌ 错误：翻译内容未进入 bundle，检查 metro.config.js 的 sourceExts 配置"
     exit 1
   fi
   ```
3. **i18n 加载方式审计**：如果使用 `require()` 加载 JSON，确认 Metro 会内联；如果使用 `fetch()` 或 `AsyncStorage`，则不受此影响
4. **代码审查 checklist**：任何新增 `require('*.json')` 的代码，必须同步检查 metro 配置

### 相关

- CASE-009: 代码目录与构建目录不同步（类似的构建产物内容错误）
- CASE-012: 单 WSL 串行构建缓存冲突（Metro 缓存相关）

---

*最后更新：2026-06-10*
*版本：v1.6 — 新增 CASE-022（首次构建 build-gradle.sh 清理逻辑失效导致 transforms 缓存污染）*
