---
alwaysApply: false
description: 环境依赖异常案例集锦 - WSL、Node.js、Java、SDK等环境问题
---

# 环境依赖异常案例集锦

> 记录 WSL、Node.js、Java、Android SDK 等环境配置和依赖管理过程中遇到的异常及解决方案。
>
> **使用方式**：遇到环境问题时，搜索错误关键词，找到对应案例，按解决步骤执行。

---

## 案例索引

| 编号 | 问题 | 严重程度 | 频率 | 状态 |
|------|------|----------|------|------|
| [CASE-E001](#case-e001-wsl-实例未启动) | WSL 实例未启动 | high | occasional | resolved |
| [CASE-E002](#case-e002-nodejs-版本不匹配) | Node.js 版本不匹配 | high | frequent | resolved |
| [CASE-E003](#case-e003-java-版本冲突) | Java 版本冲突 | medium | occasional | resolved |
| [CASE-E004](#case-e004-android-sdk-组件缺失) | Android SDK 组件缺失 | high | occasional | resolved |
| [CASE-E005](#case-e005-wsl-路径挂载问题) | WSL 路径挂载问题 | medium | occasional | resolved |
| [CASE-E006](#case-e006-npm-权限问题) | npm 权限问题 | medium | frequent | resolved |
| [CASE-E007](#case-e007-git-配置问题) | Git 配置问题 | low | frequent | resolved |
| [CASE-E008](#case-e008-网络代理问题) | 网络代理问题 | high | occasional | resolved |
| [CASE-E009](#case-e009-web-构建失败阻塞-api-部署) | Web 构建失败阻塞 API 部署 | high | occasional | resolved |
| [CASE-E010](#case-e010-wsl-双实例并行构建缓存冲突) | WSL 双实例并行构建缓存冲突 | high | frequent | resolved |

---

## CASE-E001: WSL 实例未启动

```yaml
---
id: CASE-E001
category: env-dependency
severity: high
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

执行 WSL 命令时提示实例未运行：

```
Windows Subsystem for Linux has no installed distributions.
```

或

```
The requested operation requires elevation.
```

### 根因

1. **WSL 未安装**：Windows 上未启用 WSL 功能
2. **实例未创建**：WSL 实例（`linkchest-global` 或 `linkchest-cn`）未创建或已删除
3. **WSL 服务停止**：WSL 服务未运行
4. **权限不足**：需要管理员权限执行 WSL 命令

### 解决

**步骤 1**：检查 WSL 状态
```powershell
# PowerShell 中执行
wsl --list --verbose
wsl --status
```

**步骤 2**：如果实例未运行，启动它
```powershell
wsl -d linkchest-global
```

**步骤 3**：如果实例不存在，重新创建
```powershell
# 导入备份
# 导入备份（国际版）
wsl --import linkchest-global D:\WSL\linkchest-global D:\WSL\backups\linkchest-global.tar

# 导入备份（国内版）
wsl --import linkchest-cn D:\WSL\linkchest-cn D:\WSL\backups\linkchest-cn.tar

# 或从 Microsoft Store 安装 Ubuntu
wsl --install -d Ubuntu-24.04
```

**步骤 4**：设置默认用户
```bash
# 在 WSL 内执行
echo "[user]\ndefault=mayn" > /etc/wsl.conf
```

### 预防

1. **自动启动**：设置 WSL 自动启动
2. **定期备份**：定期导出 WSL 实例备份
3. **监控状态**：构建前检查 WSL 状态
4. **文档记录**：记录 WSL 配置步骤

### 相关

- CASE-006: WSL 环境变量未设置

---

## CASE-E002: Node.js 版本不匹配

```yaml
---
id: CASE-E002
category: env-dependency
severity: high
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

构建时提示 Node.js 版本不兼容：

```
error: @linkchest/api@1.0.0: The engine "node" is incompatible with this module.
Expected version ">=20.0.0". Got "18.17.0"
```

### 根因

1. **版本过低**：当前 Node.js 版本低于项目要求
2. **版本过高**：当前 Node.js 版本过高，部分依赖不兼容
3. **nvm 切换失败**：nvm 切换版本后未生效
4. **路径冲突**：多个 Node.js 安装路径冲突

### 解决

**步骤 1**：检查当前版本
```bash
node -v
npm -v
```

**步骤 2**：使用 nvm 切换版本
```bash
# 安装 nvm（如果未安装）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装并切换版本
nvm install 20
nvm use 20
nvm alias default 20
```

**步骤 3**：如果 nvm 不可用，直接安装
```bash
# 使用 n（Node 版本管理器）
npm install -g n
n 20

# 或使用官方安装包
# 下载并安装 Node.js 20.x
```

**步骤 4**：验证版本
```bash
node -v  # 应输出 v20.x.x
```

### 预防

1. **.nvmrc**：项目根目录添加 `.nvmrc` 文件
2. **engine 字段**：`package.json` 中指定 `engines` 字段
3. **CI 验证**：CI 中验证 Node.js 版本
4. **文档说明**：README 中说明 Node.js 版本要求

### 相关

- CASE-S002: node_modules 缺失
- CASE-S005: 依赖版本冲突

---

## CASE-E003: Java 版本冲突

```yaml
---
id: CASE-E003
category: env-dependency
severity: medium
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

构建时提示 Java 版本不兼容：

```
java.lang.UnsupportedClassVersionError: ... has been compiled by a more recent version of the Java Runtime
```

### 根因

1. **版本过低**：Java 版本低于 Gradle 要求
2. **多版本冲突**：系统安装了多个 Java 版本
3. **JAVA_HOME 错误**：`JAVA_HOME` 指向了错误的版本
4. **Gradle 要求**：Gradle 8.x 需要 Java 17+

### 解决

**步骤 1**：检查当前 Java 版本
```bash
java -version
echo $JAVA_HOME
```

**步骤 2**：安装正确的 Java 版本
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk

# 验证安装
/usr/lib/jvm/java-17-openjdk-amd64/bin/java -version
```

**步骤 3**：设置 JAVA_HOME
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# 永久设置（加入 ~/.bashrc）
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
```

**步骤 4**：验证 Gradle 兼容性
```bash
./gradlew --version
# 应显示 Gradle 8.8 + JVM 17
```

### 预防

1. **版本锁定**：项目文档明确 Java 版本
2. **环境检查**：构建前验证 Java 版本
3. **单一版本**：WSL 内只安装一个 Java 版本
4. **脚本验证**：构建脚本中检查 Java 版本

### 相关

- CASE-006: WSL 环境变量未设置
- CASE-007: Gradle 版本不兼容

---

## CASE-E004: Android SDK 组件缺失

```yaml
---
id: CASE-E004
category: env-dependency
severity: high
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

构建时提示 Android SDK 组件缺失：

```
SDK location not found. Define location with sdk.dir in the local.properties file
```

或

```
Failed to find target with hash string 'android-34'
```

### 根因

1. **SDK 未安装**：Android SDK 未安装或路径错误
2. **平台工具缺失**：`platform-tools` 或 `build-tools` 未安装
3. **API 级别缺失**：目标 API 级别（android-34）未安装
4. **路径配置错误**：`ANDROID_HOME` 或 `local.properties` 配置错误

### 解决

**步骤 1**：检查 SDK 安装
```bash
ls -la /opt/android-sdk
ls -la /opt/android-sdk/platforms/
ls -la /opt/android-sdk/build-tools/
```

**步骤 2**：安装缺失组件
```bash
# 使用 sdkmanager 安装
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"
sdkmanager "platform-tools"
```

**步骤 3**：创建 local.properties
```bash
echo "sdk.dir=/opt/android-sdk" > project/apps/mobile/android/local.properties
```

**步骤 4**：验证环境
```bash
adb --version
aapt version
```

### 预防

1. **预配置环境**：WSL 实例预装所有 SDK 组件
2. **环境检查脚本**：构建前自动检查 SDK 组件
3. **文档清单**：维护 SDK 组件清单
4. **定期验证**：定期验证 SDK 完整性

### 相关

- CASE-006: WSL 环境变量未设置
- CASE-E001: WSL 实例未启动

---

## CASE-E005: WSL 路径挂载问题

```yaml
---
id: CASE-E005
category: env-dependency
severity: medium
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

WSL 内访问 Windows 文件路径时出错：

```
cd: /mnt/d/trae_projects/linkchest: No such file or directory
```

或文件权限问题：

```
Permission denied
```

### 根因

1. **磁盘未挂载**：Windows 磁盘未自动挂载到 WSL
2. **路径格式错误**：使用了 Windows 路径格式而非 Linux 格式
3. **权限问题**：WSL 内用户没有访问权限
4. **wsl.conf 配置**：挂载配置不正确

### 解决

**步骤 1**：检查挂载点
```bash
ls -la /mnt/
ls -la /mnt/d/
```

**步骤 2**：手动挂载磁盘
```bash
# 如果未挂载，手动挂载
sudo mkdir -p /mnt/d
sudo mount -t drvfs D: /mnt/d
```

**步骤 3**：修复权限
```bash
# 修改 wsl.conf
sudo tee /etc/wsl.conf > /dev/null <<EOF
[automount]
enabled = true
mountFsTab = false
root = /mnt/
options = "metadata,umask=22,fmask=11"
EOF

# 重启 WSL
wsl --shutdown
wsl -d linkchest-global
```

**步骤 4**：使用正确路径格式
```bash
# ✅ 正确：使用 Linux 路径格式
cd /mnt/d/trae_projects/linkchest

# ❌ 错误：使用 Windows 路径格式
cd D:\trae_projects\linkchest
```

### 预防

1. **自动挂载**：确保 WSL 自动挂载 Windows 磁盘
2. **路径规范**：统一使用 Linux 路径格式
3. **权限配置**：正确配置 `wsl.conf` 权限选项
4. **文档说明**：文档中说明路径转换规则

### 相关

- CASE-E001: WSL 实例未启动
- CASE-008: 构建脚本引号转义问题

---

## CASE-E006: npm 权限问题

```yaml
---
id: CASE-E006
category: env-dependency
severity: medium
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

npm 安装时提示权限不足：

```
npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/...'
```

### 根因

1. **全局安装权限**：全局安装需要管理员权限
2. **目录所有权**：`node_modules` 目录所有权错误
3. **npm 前缀**：npm 前缀配置到系统目录
4. **sudo 使用**：使用 sudo 运行 npm 导致权限混乱

### 解决

**步骤 1**：更改 npm 默认目录
```bash
# 创建本地 npm 目录
mkdir ~/.npm-global

# 配置 npm 使用新目录
npm config set prefix '~/.npm-global'

# 添加 PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**步骤 2**：修复目录权限
```bash
# 修复项目目录权限
sudo chown -R $(whoami) ~/.npm-global
sudo chown -R $(whoami) ~/project/node_modules
```

**步骤 3**：使用 npx 替代全局安装
```bash
# 不推荐：全局安装
npm install -g typescript

# 推荐：使用 npx
npx typescript
```

### 预防

1. **本地安装**：优先使用本地安装而非全局安装
2. **npx 使用**：使用 `npx` 运行本地包
3. **权限检查**：安装前检查目录权限
4. **文档规范**：文档中说明正确的安装方式

### 相关

- CASE-S002: node_modules 缺失
- CASE-E002: Node.js 版本不匹配

---

## CASE-E007: Git 配置问题

```yaml
---
id: CASE-E007
category: env-dependency
severity: low
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

Git 操作时提示配置错误：

```
*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"
```

或

```
fatal: unable to access 'https://github.com/...': Could not resolve host: github.com
```

### 根因

1. **用户信息未配置**：Git 用户名和邮箱未设置
2. **SSH 密钥问题**：SSH 密钥未配置或权限错误
3. **网络问题**：无法访问 Git 远程仓库
4. **代理配置**：Git 代理配置错误

### 解决

**步骤 1**：配置用户信息
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**步骤 2**：配置 SSH
```bash
# 生成 SSH 密钥
ssh-keygen -t ed25519 -C "you@example.com"

# 添加密钥到 ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 复制公钥到 GitHub
cat ~/.ssh/id_ed25519.pub
```

**步骤 3**：测试连接
```bash
ssh -T git@github.com
```

**步骤 4**：如果使用 HTTPS，配置凭据
```bash
git config --global credential.helper cache
```

### 预防

1. **全局配置**：一次性配置全局 Git 用户信息
2. **SSH 优先**：使用 SSH 而非 HTTPS
3. **凭据管理**：使用凭据管理器缓存密码
4. **文档说明**：新员工入职文档包含 Git 配置步骤

### 相关

- CASE-E008: 网络代理问题

---

## CASE-E008: 网络代理问题

```yaml
---
id: CASE-E008
category: env-dependency
severity: high
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

网络请求失败，无法下载依赖：

```
npm ERR! code ETIMEDOUT
npm ERR! errno ETIMEDOUT
npm ERR! network request to https://registry.npmjs.org/... failed
```

或

```
curl: (7) Failed to connect to raw.githubusercontent.com port 443: Connection refused
```

### 根因

1. **网络限制**：公司网络限制访问外部资源
2. **DNS 问题**：DNS 解析失败
3. **代理配置**：需要代理但未配置
4. **防火墙**：防火墙阻止了特定端口

### 解决

**步骤 1**：检查网络连接
```bash
ping google.com
ping registry.npmjs.org
```

**步骤 2**：配置 npm 使用国内镜像
```bash
# 淘宝镜像
npm config set registry https://registry.npmmirror.com

# 或腾讯云镜像
npm config set registry https://mirrors.cloud.tencent.com/npm/
```

**步骤 3**：配置 Git 代理
```bash
# HTTP 代理
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy http://proxy.company.com:8080

# SOCKS5 代理
git config --global http.proxy socks5://127.0.0.1:1080
```

**步骤 4**：配置系统代理
```bash
# 临时设置
export http_proxy=http://proxy.company.com:8080
export https_proxy=http://proxy.company.com:8080

# 永久设置（加入 ~/.bashrc）
echo 'export http_proxy=http://proxy.company.com:8080' >> ~/.bashrc
echo 'export https_proxy=http://proxy.company.com:8080' >> ~/.bashrc
```

### 预防

1. **国内镜像**：默认配置国内 npm 镜像
2. **代理文档**：文档中说明代理配置方法
3. **离线缓存**：定期缓存常用依赖
4. **网络检测**：构建前检测网络连通性

### 相关

- CASE-001: Gradle 镜像被重置
- CASE-E002: Node.js 版本不匹配

---

## CASE-E009: Web 构建失败阻塞 API 部署

```yaml
---
id: CASE-E009
category: env-dependency
severity: high
frequency: occasional
first_seen: "2026-05-15"
last_seen: "2026-05-15"
status: resolved
---
```

### 现象

部署脚本执行时 Web 前端构建失败，导致整个部署流程中断，API 服务未能启动：

```
Failed to compile.
./src/app/(main)/manage/page.tsx
Module not found: Can't resolve 'framer-motion'

> Build failed because of webpack errors
npm error Lifecycle script `build` failed with error:
```

部署脚本退出后，服务器上 API 服务未运行，只有 Web 服务在运行：

```
pm2 status
# 只显示 linkchest-web，没有 linkchest-api
```

### 根因

1. **部署脚本设计缺陷**：使用 `set -e` 严格模式，任何命令失败都会退出整个脚本
2. **Web 构建失败触发 exit 1**：脚本中 Web 构建失败时执行 `exit 1`，导致后续的 API 启动代码未执行
3. **依赖缺失**：远程服务器上 `apps/web/node_modules/framer-motion` 不存在（之前被 `rm -rf node_modules` 删除后未正确安装）
4. **构建顺序问题**：先构建 Web 再启动 API，Web 失败会阻塞 API

### 解决

**步骤 1**：修复部署脚本，让 Web 构建失败不阻塞 API 启动

```bash
# 修改前：Web 构建失败会 exit 1
npm run build
cd /opt/linkchest/api
if [ ! -d apps/web/.next ]; then
    echo "ERROR: apps/web/.next directory not found after build!"
    exit 1  # ❌ 这里导致整个部署失败
fi

# 修改后：API 先启动，Web 构建改为非阻塞
echo "[Remote] Building API..."
cd apps/api
npm run build
cd /opt/linkchest/api

# 先启动 API
echo "[Remote] Starting API service (PM2)..."
pm2 delete linkchest-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.js --only linkchest-api
pm2 save

# Web 构建改为非阻塞
echo "[Remote] Building Web (non-blocking)..."
cd apps/web
npm install framer-motion  # 确保依赖存在
npm run build
WEB_BUILD_EXIT=$?

if [ $WEB_BUILD_EXIT -eq 0 ] && [ -d apps/web/.next ]; then
    pm2 start deploy/ecosystem.config.js --only linkchest-web
else
    echo "[Remote] Web build failed, but API is running."
fi
```

**步骤 2**：手动修复当前服务器状态

```bash
# 在远程服务器上安装缺失的依赖
cd /opt/linkchest/api/apps/web
npm install framer-motion

# 重新构建 Web
npm run build

# 启动 Web 服务
cd /opt/linkchest/api
pm2 start deploy/ecosystem.config.js --only linkchest-web
```

**步骤 3**：验证服务状态

```bash
pm2 status
curl -s http://localhost:3001/health    # API
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003  # Web
```

### 预防

1. **独立启动**：API 和 Web 服务独立启动，互不影响
2. **非阻塞构建**：Web 构建失败不阻塞 API 部署
3. **依赖检查**：构建前检查关键依赖是否存在
4. **健康检查**：部署后分别检查 API 和 Web 的健康状态
5. **不要删除 node_modules**：避免 `rm -rf node_modules`，改用 `npm install` 更新

### 相关

- CASE-E006: npm 权限问题
- CASE-E008: 网络代理问题

---

## CASE-E010: WSL 双实例并行构建缓存冲突

```yaml
---
id: CASE-E010
category: env-dependency
severity: high
frequency: frequent
first_seen: "2026-05-22"
last_seen: "2026-05-22"
status: resolved
---
```

### 现象

使用双 WSL 实例（`linkchest-global` + `linkchest-cn`）并行构建 APK 时，国内版 APK 仍包含海外配置：

- 国内版 bundle 中出现 `linkchest.net`（海外域名）
- 国内版显示 Google/Apple 登录按钮而非微信/支付宝
- `Constants.expoConfig.extra.market` 读取为 `global` 而非 `china`

### 根因

1. **`.env.market` 共享文件竞争**：两个 WSL 实例同时写入同一个 `.env.market` 文件，后写入的值覆盖前一个
2. **Metro 缓存未完全隔离**：两个实例共享默认 Metro 缓存目录，`linkchest-global` 先构建的缓存被 `linkchest-cn` 复用
3. **JS bundle 清理不彻底**：仅删除 `createBundle*ReleaseJsAndAssets` 目录，Gradle 的 UP-TO-DATE 检查仍认为缓存有效
4. **`app.config.js` 未优先读取实例隔离文件**：未使用 `/tmp/.env.market.{WSL_DISTRO_NAME}` 等实例特定路径

### 解决

**步骤 1**：确认当前 MARKET 配置
```bash
# 在两个 WSL 实例中分别检查
cat /mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market
cat /tmp/.env.market.linkchest-cn
cat /tmp/.env.market.linkchest-global
```

**步骤 2**：清理所有 Metro 缓存和 JS bundle
```bash
# 在每个 WSL 实例中执行
rm -rf /tmp/metro-cache-*
rm -rf /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build/generated/assets/*Bundle*
rm -rf /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build/generated/res/*Bundle*
rm -rf /mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/expo-constants/android/build
```

**步骤 3**：使用改进后的构建脚本（已集成到 build-gradle.sh）
```bash
# 脚本已自动完成以下操作：
# - 写入 /tmp/.env.market.{WSL_DISTRO_NAME}（实例隔离）
# - 设置 REACT_NATIVE_METRO_CACHE_DIR（Metro 缓存隔离）
# - 彻底清理所有 JS bundle 和 Gradle 缓存标记
# - 构建后验证国内版 bundle 不包含海外域名
```

**步骤 4**：验证修复结果
```bash
# 国内版构建完成后检查 bundle
grep -c "linkchest.net" /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build/generated/assets/createBundleChinaReleaseJsAndAssets/index.android.bundle
# 应输出 0
```

### 预防

1. **实例隔离原则**：所有并行构建的配置文件必须写入实例特定路径（`/tmp/` 下）
2. **Metro 缓存隔离**：通过 `REACT_NATIVE_METRO_CACHE_DIR` 环境变量设置独立缓存目录
3. **构建后验证**：国内版必须验证 bundle 中不包含 `linkchest.net`
4. **WSL 实例名校验**：`app.config.js` 中增加 WSL 实例名与 MARKET 值的冲突检测和自动修正

### 相关

- CASE-012: 单 WSL 串行构建缓存冲突（已通过双 WSL 解决）
- CASE-001: Gradle 镜像被重置为官方地址
- CASE-004: Gradle 反复下载依赖

---

*最后更新：2026-05-22*
*版本：v1.2*
