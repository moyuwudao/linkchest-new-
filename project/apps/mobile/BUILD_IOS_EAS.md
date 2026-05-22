# iOS EAS 云构建方案 — LinkChest Mobile

> 本文档定义使用 Expo EAS (Expo Application Services) 云构建 iOS 的完整流程。
> **核心优势**：无需 Mac，Windows 下一条命令完成构建，自动处理证书和上传。
> **适用范围**：国际版（global）和国内版（china）iOS 构建。
> **最后更新**：2026-05-21

---

## 1. 方案对比：EAS 云构建 vs 本地 Mac 构建

| 维度 | EAS 云构建（本方案） | 本地 Mac 构建 |
|------|---------------------|--------------|
| **是否需要 Mac** | ❌ 不需要 | ✅ 必须 |
| **操作环境** | Windows + TRAE | Mac + Xcode |
| **构建命令** | `eas build --platform ios` | `xcodebuild archive` |
| **证书管理** | EAS 自动处理 | 手动配置 |
| **构建时间** | 15-30 分钟（云端排队） | 5-15 分钟（本地） |
| **成本** | 免费 30 次/月，$29/月 无限 | 免费（仅 Mac 硬件成本） |
| **一次构建成功率** | ~90%（网络/排队因素） | ~95%（本地环境稳定） |
| **与 Android 一致性** | 统一 `build-ios.ps1` 入口 | 统一 `build-ios.ps1` 入口 |

**选型结论**：考虑到您不是编程人员、Mac 操作不便、TRAE 无法直接控制 Mac，**EAS 云构建是唯一可行方案**。

---

## 2. 环境准备

### 2.1 必要条件

| 条件 | 状态 | 说明 |
|------|------|------|
| Apple Developer 账户 | 您已拥有 | $99/年，用于 iOS 签名和发布 |
| Expo 账户 | 需注册 | 免费注册，用于 EAS 构建服务 |
| Node.js 18+ | 需确认 | Windows 本地需安装 |
| eas-cli | 需安装 | EAS 命令行工具 |

### 2.2 安装步骤（TRAE 可代劳）

```bash
# 1. 安装 EAS CLI（全局）
npm install -g eas-cli

# 2. 登录 Expo 账户
eas login
# 按提示输入 Expo 账号邮箱和密码

# 3. 验证登录状态
eas whoami

# 4. 初始化项目 EAS 配置（如果未配置）
cd project/apps/mobile
eas init
```

---

## 3. EAS 配置

### 3.1 eas.json 配置

项目已存在 [eas.json](eas.json)，需扩展为支持双版本构建：

```json
{
  "cli": {
    "version": ">= 18.11.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production-global": {
      "autoIncrement": true,
      "env": {
        "MARKET": "global"
      }
    },
    "production-china": {
      "autoIncrement": true,
      "env": {
        "MARKET": "china"
      }
    }
  },
  "submit": {
    "production-global": {},
    "production-china": {}
  }
}
```

### 3.2 app.config.js 适配

EAS 构建时通过环境变量传递 MARKET，需确保 [app.config.js](app.config.js) 正确读取：

```javascript
// app.config.js 已支持从 .env.market 或 process.env.MARKET 读取
// EAS 构建时会通过 env 注入 MARKET，无需额外修改
```

### 3.3 证书自动管理

EAS 支持自动管理 iOS 证书：

```bash
# 首次构建时，EAS 会自动：
# 1. 生成 iOS Distribution Certificate
# 2. 生成 Provisioning Profile
# 3. 下载并配置到构建环境

# 如需手动管理证书
eas credentials
```

---

## 4. 构建流程

### 4.1 统一入口（与 Android 保持一致风格）

```powershell
# build-ios-eas.ps1

# 构建国际版
.\build-ios-eas.ps1 global

# 构建国内版
.\build-ios-eas.ps1 china

# 构建两个版本（串行）
.\build-ios-eas.ps1 all
```

### 4.2 PowerShell 脚本

```powershell
# build-ios-eas.ps1
param(
    [string]$Flavor = "all"
)

$ErrorActionPreference = "Stop"

function Build-Flavor {
    param([string]$FlavorName)

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Starting $FlavorName iOS EAS build" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan

    # 写入 .env.market（与 Android 一致）
    $envMarketPath = "project/apps/mobile/.env.market"
    Set-Content -Path $envMarketPath -Value $FlavorName -NoNewline
    Write-Host "=== Written .env.market: $FlavorName ==="

    # 构建配置
    $buildProfile = "production-$FlavorName"

    # 执行 EAS 构建
    cd project/apps/mobile
    $buildCmd = "eas build --platform ios --profile $buildProfile --non-interactive"
    Write-Host "=== Executing: $buildCmd ==="

    Invoke-Expression $buildCmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $FlavorName build failed" -ForegroundColor Red
        return $false
    }
    Write-Host "✅ $FlavorName build succeeded" -ForegroundColor Green
    return $true
}

# 串行构建（EAS 免费版不支持并行）
$globalOk = $true
$chinaOk = $true

if ($Flavor -eq "all") {
    $globalOk = Build-Flavor -FlavorName "global"
    $chinaOk = Build-Flavor -FlavorName "china"
}
elseif ($Flavor -eq "global") {
    $globalOk = Build-Flavor -FlavorName "global"
}
elseif ($Flavor -eq "china") {
    $chinaOk = Build-Flavor -FlavorName "china"
}
else {
    Write-Host "Unknown flavor: $Flavor. Use 'global', 'china', or 'all'" -ForegroundColor Red
    exit 1
}

# 汇总结果
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BUILD SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Global: $(if ($globalOk) { '✅ SUCCESS' } else { '❌ FAILED' })" -ForegroundColor $(if ($globalOk) { 'Green' } else { 'Red' })
Write-Host "  China:  $(if ($chinaOk) { '✅ SUCCESS' } else { '❌ FAILED' })" -ForegroundColor $(if ($chinaOk) { 'Green' } else { 'Red' })

if (-not $globalOk -or -not $chinaOk) {
    exit 1
}
```

### 4.3 构建过程说明

```
执行 build-ios-eas.ps1
    ↓
1. 写入 .env.market（global 或 china）
    ↓
2. 调用 eas build --platform ios --profile production-global
    ↓
3. EAS 上传项目到云端 Mac 构建服务器
    ↓
4. 云端执行：
   - 读取 app.config.js（自动识别 bundleIdentifier）
   - 安装 npm 依赖
   - 执行 npx expo prebuild --platform ios
   - pod install
   - xcodebuild archive + export
    ↓
5. 构建完成，提供下载链接
    ↓
6. 自动上传到 App Store Connect（如配置 submit）
```

---

## 5. 质量监控机制

### 5.1 构建前检查清单

```
□ eas-cli 已安装且版本 >= 18.11.0
□ eas login 登录状态有效
□ Apple Developer 账户有效
□ .env.market 文件内容正确
□ app.config.js 中 bundleIdentifier 正确
□ eas.json 中 build profile 配置正确
□ 项目代码已提交（EAS 构建基于 Git 提交）
```

### 5.2 构建状态监控

```bash
# 查看构建队列和状态
eas build:list

# 查看特定构建日志
eas build:logs --id BUILD_ID

# 取消正在进行的构建
eas build:cancel --id BUILD_ID
```

### 5.3 构建后验证

```bash
# 下载构建产物
eas build:download --id BUILD_ID

# 验证 IPA 信息
unzip -l LinkChest.ipa
```

---

## 6. 风险应对预案

### 6.1 常见错误及解决方案

| 错误关键词 | 案例编号 | 原因 | 解决方案 |
|-----------|---------|------|----------|
| `Authentication with Apple Developer Portal failed` | EAS-001 | Apple ID 或密码错误 | 检查 Apple Developer 账户，更新凭据 |
| `Provisioning profile doesn't include` | EAS-002 | 设备 UDID 未注册 | 在 Apple Developer Portal 添加设备 UDID |
| `Build quota exceeded` | EAS-003 | 免费构建次数用完 | 等待下月重置或升级付费计划 |
| `CocoaPods could not find compatible versions` | EAS-004 | Pod 依赖冲突 | 本地执行 `cd ios && pod install` 验证 |
| `Metro bundler failed` | EAS-005 | JS 打包错误 | 检查代码语法错误，本地 `npx expo start` 验证 |
| `Invalid bundle identifier` | EAS-006 | Bundle ID 格式错误 | 检查 app.config.js 中的 bundleIdentifier |
| `Two-factor authentication required` | EAS-007 | Apple ID 开启 2FA | 使用 App 专用密码 |
| `App Store Connect API key invalid` | EAS-008 | API Key 过期 | 在 App Store Connect 重新生成 |

### 6.2 构建失败自动分析

```powershell
# build-ios-eas.ps1 中的错误分析
if ($LASTEXITCODE -ne 0) {
    Write-Host "=== 构建失败，启动自动分析 ==="

    # 获取最近构建日志
    $buildLog = eas build:list --limit 1 --json | ConvertFrom-Json
    $buildId = $buildLog[0].id
    $buildStatus = $buildLog[0].status

    Write-Host "Build ID: $buildId"
    Write-Host "Status: $buildStatus"

    # 下载日志分析
    eas build:logs --id $buildId > /tmp/eas-build-log.txt

    if (Select-String -Path /tmp/eas-build-log.txt -Pattern "Authentication with Apple") {
        Write-Host "🔴 EAS-001: Apple Developer 认证失败"
        Write-Host "🔧 解决: 运行 eas credentials 重新配置"
    }

    if (Select-String -Path /tmp/eas-build-log.txt -Pattern "quota exceeded") {
        Write-Host "🔴 EAS-003: 构建配额已用完"
        Write-Host "🔧 解决: 等待下月重置或访问 https://expo.dev/pricing 升级"
    }

    # ... 其他错误匹配
}
```

### 6.3 配额管理

| 计划 | 价格 | iOS 构建次数 | 并发构建 |
|------|------|-------------|---------|
| **Free** | $0 | 30 次/月 | 1 个 |
| **Production** | $29/月 | 无限 | 2 个 |
| **Enterprise** | $999/月 | 无限 | 10 个 |

**建议**：
- 开发阶段使用 Free 计划
- 接近发布时升级 Production 计划
- 监控配额使用：`eas build:list` 查看本月构建次数

---

## 7. App Store 提交

### 7.1 自动提交配置

```json
// eas.json 中配置 submit
{
  "submit": {
    "production-global": {
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
      "ascApiKeyPath": "./AuthKey.p8",
      "ascApiKeyIssuerId": "YOUR_ISSUER_ID",
      "ascApiKeyId": "YOUR_KEY_ID"
    }
  }
}
```

### 7.2 手动提交流程

```bash
# 1. 构建并自动提交
eas build --platform ios --profile production-global --auto-submit

# 2. 或构建后单独提交
eas build --platform ios --profile production-global
eas submit --platform ios --id BUILD_ID
```

### 7.3 App Store Connect 配置

1. 登录 [App Store Connect](https://appstoreconnect.apple.com/)
2. 创建新应用（如果首次提交）
3. 填写应用信息：名称、描述、关键词、截图
4. 配置隐私政策链接
5. 设置年龄分级
6. 提交审核

---

## 8. 与现有构建体系的整合

### 8.1 目录结构

```
project/apps/mobile/
├── build-apk.ps1          # Android 统一入口
├── build-gradle.sh        # Android 构建脚本
├── build-ios-eas.ps1      # iOS EAS 统一入口（新增）
├── .env.market            # 市场标记文件（共用）
├── app.config.js          # Expo 配置（共用）
├── eas.json               # EAS 配置（已存在，需扩展）
├── android/               # Android 项目
└── ios/                   # iOS 项目
```

### 8.2 与 Android 构建的一致性

| 维度 | Android | iOS (EAS) |
|------|---------|-----------|
| 统一入口 | `build-apk.ps1` | `build-ios-eas.ps1` |
| 市场切换 | `.env.market` | `.env.market` |
| 多版本支持 | global / china | global / china |
| 产物命名 | `linkchest-{flavor}-{timestamp}.apk` | EAS 自动生成 |
| 日志捕获 | 本地文件 | EAS 云端日志 |
| 错误分析 | 关键词匹配 | 关键词匹配 + EAS 日志 |

---

## 9. 附录

### 9.1 常用命令速查

```bash
# 登录/登出
eas login
eas logout

# 构建
eas build --platform ios --profile production-global
eas build --platform ios --profile production-china

# 查看构建列表
eas build:list
eas build:list --platform ios --limit 10

# 查看构建日志
eas build:logs --id BUILD_ID

# 下载构建产物
eas build:download --id BUILD_ID

# 提交到 App Store
eas submit --platform ios --id BUILD_ID

# 管理证书
eas credentials

# 项目信息
eas project:info
```

### 9.2 参考文档

- [EAS Build 官方文档](https://docs.expo.dev/build/introduction/)
- [EAS Submit 官方文档](https://docs.expo.dev/submit/introduction/)
- [Expo iOS Build 指南](https://docs.expo.dev/build/setup/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## 10. 方案总结

### 10.1 优势

- ✅ **无需 Mac**：Windows 下完成全部操作
- ✅ **TRAE 可控**：所有命令可在 TRAE 终端执行
- ✅ **自动化程度高**：证书、构建、上传一键完成
- ✅ **与 Android 一致**：统一 `.env.market` 市场切换机制
- ✅ **适合非技术人员**：操作简单，出错率低

### 10.2 劣势

- ⚠️ **构建配额限制**：免费版 30 次/月
- ⚠️ **构建时间不稳定**：受云端排队影响
- ⚠️ **网络依赖**：需要稳定连接 Expo 服务器
- ⚠️ **成本**：Production 计划 $29/月

### 10.3 推荐执行步骤

```
第 1 步：注册 Expo 账户
    ↓
第 2 步：安装 eas-cli
    ↓
第 3 步：配置 eas.json（添加 production-global / production-china）
    ↓
第 4 步：首次构建测试（global 版本）
    ↓
第 5 步：验证构建产物
    ↓
第 6 步：配置 App Store Connect 提交
    ↓
第 7 步：正式构建并提交审核
```

---

*版本：v1.0*
*创建日期：2026-05-21*
*维护者：LinkChest Dev Team*
