# iOS 构建方案 — LinkChest Mobile

> 本文档定义 iOS 版本的完整构建流程，与 Android 构建方案保持技术架构一致性。
> **适用范围**：国际版（global）和国内版（china）iOS 构建。
> **最后更新**：2026-05-21

---

## 1. 架构概述

### 1.1 与 Android 构建方案的一致性

| 维度 | Android | iOS |
|------|---------|-----|
| 技术栈 | Expo + React Native | Expo + React Native |
| 多版本构建 | 双 WSL 实例（global / china） | 双 Xcode 配置（global / china） |
| 市场切换 | `.env.market` 文件驱动 | `.env.market` 文件驱动 |
| 统一入口 | `build-apk.ps1` | `build-ios.ps1` |
| 构建脚本 | `build-gradle.sh` | `build-xcode.sh` |
| 日志捕获 | 自动捕获 + 关键词匹配 | 自动捕获 + 关键词匹配 |
| 产物命名 | `linkchest-{flavor}-{timestamp}.apk` | `linkchest-{flavor}-{timestamp}.ipa` |

### 1.2 构建模式

| 模式 | 用途 | 产物 | 签名 |
|------|------|------|------|
| **Development** | 开发调试 | `.app` | 开发证书 |
| **Ad Hoc** | 内部分发 | `.ipa` | 分发证书 + Ad Hoc Profile |
| **App Store** | App Store 提交 | `.ipa` | 分发证书 + App Store Profile |

---

## 2. 环境要求

### 2.1 硬件要求

- **Mac 设备**：必须（Apple 官方要求，iOS 构建只能在 macOS 上执行）
- **最低配置**：macOS 14+，16GB RAM，100GB 可用磁盘空间
- **推荐配置**：Apple Silicon (M1/M2/M3/M4)，32GB RAM，SSD

### 2.2 软件要求

| 软件 | 版本 | 用途 |
|------|------|------|
| macOS | 14.0+ | 操作系统 |
| Xcode | 15.0+ | IDE + 编译器 + 模拟器 |
| Node.js | 18.x LTS | JS 运行时 |
| CocoaPods | 1.14+ | iOS 依赖管理 |
| Ruby | 3.0+ | CocoaPods 依赖 |
| fastlane | 2.220+ | 自动化构建和分发（可选但推荐） |

### 2.3 Apple 开发者账户

- **有效 Apple Developer Program 账户**（$99/年）
- **Team ID** 已确认
- **Bundle Identifier** 已注册：`com.linkchest.app`（国内外版统一，与软著登记一致）

---

## 3. 项目配置

### 3.1 现有 iOS 项目结构

```
project/apps/mobile/ios/
├── LinkChest/
│   ├── AppDelegate.h
│   ├── AppDelegate.mm
│   ├── Info.plist              # 应用信息配置
│   ├── LinkChest.entitlements  # 权限配置
│   ├── main.m
│   ├── noop-file.swift
│   ├── LinkChest-Bridging-Header.h
│   ├── SplashScreen.storyboard
│   └── Images.xcassets/        # 图标和启动图
├── LinkChest.xcodeproj/
│   └── project.pbxproj         # Xcode 项目配置
├── Podfile                     # CocoaPods 依赖
├── Podfile.properties.json     # Pod 配置
└── .xcode.env                  # Xcode 环境变量
```

### 3.2 市场切换机制（与 Android 一致）

通过 `.env.market` 文件驱动，[app.config.js](app.config.js) 读取并动态配置：

```javascript
// app.config.js 关键配置
// 国内外版统一 bundleId（与软著登记一致）
ios: {
  bundleIdentifier: 'com.linkchest.app',
}
```

### 3.3 国内版特殊配置

> **重要变更（2026-06-03）**：国内外版统一使用 `com.linkchest.app`（与国内软著登记一致），通过应用名称、API、登录方式等内容维度区分版本。**iOS Bundle ID 不再区分国内/海外**。

| 配置项 | 国际版 (global) | 国内版 (china) |
|--------|----------------|----------------|
| Bundle ID | `com.linkchest.app` | `com.linkchest.app`（统一） |
| 应用名称 | LinkChest | 链藏 |
| 服务器地址 | `https://linkchest.net` | `http://linkchest.cn` |
| ATS (HTTPS) | 强制 HTTPS | 允许 HTTP |
| 登录方式 | Google / Email | Email / 微信（未来） |

**国内版 ATS 配置**（Info.plist）：

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

---

## 4. 证书管理策略

### 4.1 证书类型

| 类型 | 用途 | 有效期 | 管理方式 |
|------|------|--------|----------|
| **Development Certificate** | 开发调试 | 1年 | Apple Developer Portal |
| **Distribution Certificate** | 分发/发布 | 1年 | Apple Developer Portal |
| **Ad Hoc Provisioning Profile** | 内测分发 | 1年 | Apple Developer Portal |
| **App Store Provisioning Profile** | App Store 发布 | 1年 | Apple Developer Portal |

### 4.2 证书存储规范

```
~/.linkchest-ios-certs/
├── global/
│   ├── development.cer
│   ├── distribution.p12
│   ├── adhoc.mobileprovision
│   └── appstore.mobileprovision
└── china/
    ├── development.cer
    ├── distribution.p12
    ├── adhoc.mobileprovision
    └── appstore.mobileprovision
```

### 4.3 证书更新流程

```
证书即将过期（提前30天提醒）
    ↓
1. 登录 Apple Developer Portal
2. 撤销旧证书，创建新证书
3. 下载并更新 Provisioning Profile
4. 更新本地证书存储
5. 验证构建是否正常
```

---

## 5. 构建工具选型

### 5.1 工具链

| 工具 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **xcodebuild** | Xcode 内置 | 编译、归档、导出 | Apple 官方 CLI，可靠性最高 |
| **CocoaPods** | 1.14+ | iOS 依赖管理 | React Native 生态标准 |
| **fastlane** | 2.220+ | 自动化构建和上传 | 简化证书管理、自动上传 TestFlight |
| **gym** | fastlane 内置 | 构建和签名 | 封装 xcodebuild，简化配置 |
| **pilot** | fastlane 内置 | TestFlight 上传 | 自动化上传和分发 |

### 5.2 与 Android 工具链对比

| 功能 | Android | iOS |
|------|---------|-----|
| 编译器 | Gradle / javac / kotlinc | xcodebuild / clang / swiftc |
| 依赖管理 | Gradle + Maven | CocoaPods + SPM |
| 签名工具 | apksigner / jarsigner | codesign |
| 包管理 | .apk / .aab | .ipa |
| 自动化 | Gradle Task | xcodebuild + fastlane |

---

## 6. 构建流程

### 6.1 统一入口（与 Android 一致）

```powershell
# 构建两个版本（串行，因 Xcode 单实例限制）
.\build-ios.ps1

# 只构建国际版
.\build-ios.ps1 global

# 只构建国内版
.\build-ios.ps1 china
```

### 6.2 构建脚本流程

```bash
# build-xcode.sh 流程
1. 读取 .env.market 确定 MARKET
2. 设置环境变量（NODE_BINARY, RCT_NEW_ARCH_ENABLED 等）
3. 执行 pod install（如果 Podfile.lock 变化）
4. 执行 xcodebuild archive
5. 执行 xcodebuild -exportArchive
6. 重命名产物为 linkchest-{flavor}-{timestamp}.ipa
7. 日志捕获和错误分析
```

### 6.3 详细构建步骤

#### 步骤 1：环境准备

```bash
# 确认 Xcode 命令行工具
xcode-select --install
xcode-select -p
# 应输出：/Applications/Xcode.app/Contents/Developer

# 确认 CocoaPods
pod --version

# 确认 Node.js
node --version
```

#### 步骤 2：安装依赖

```bash
cd project/apps/mobile

# 安装 npm 依赖
npm install

# 安装 iOS 原生依赖
cd ios
pod install --repo-update
```

#### 步骤 3：配置签名

```bash
# 方式 1：Xcode GUI 配置（首次设置）
open LinkChest.xcworkspace

# 方式 2：命令行配置（自动化）
# 通过 build-xcode.sh 脚本自动配置
```

#### 步骤 4：执行构建

```bash
# 归档（Archive）
xcodebuild \
  -workspace LinkChest.xcworkspace \
  -scheme LinkChest \
  -configuration Release \
  -archivePath build/LinkChest.xcarchive \
  archive

# 导出 IPA
xcodebuild \
  -exportArchive \
  -archivePath build/LinkChest.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ExportOptions.plist
```

### 6.4 ExportOptions.plist 配置

#### App Store 发布配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.linkchest.app</key>
    <string>LinkChest AppStore</string>
  </dict>
  <key>signingCertificate</key>
  <string>Apple Distribution</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

#### Ad Hoc 内测配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>ad-hoc</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.linkchest.app</key>
    <string>LinkChest AdHoc</string>
  </dict>
  <key>signingCertificate</key>
  <string>Apple Distribution</string>
  <key>signingStyle</key>
  <string>manual</string>
</dict>
</plist>
```

---

## 7. 自动化构建流程

### 7.1 PowerShell 统一入口脚本

```powershell
# build-ios.ps1
param(
    [string]$Flavor = "all",
    [string]$Method = "app-store"  # app-store | ad-hoc | development
)

$ErrorActionPreference = "Stop"

function Build-Flavor {
    param([string]$FlavorName, [string]$BuildMethod)

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Starting $FlavorName iOS build ($BuildMethod)" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan

    # 写入 .env.market
    $envMarketPath = "project/apps/mobile/.env.market"
    Set-Content -Path $envMarketPath -Value $FlavorName -NoNewline

    # 执行构建脚本
    $scriptPath = "project/apps/mobile/build-xcode.sh"
    bash $scriptPath $FlavorName $BuildMethod

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $FlavorName build failed" -ForegroundColor Red
        return $false
    }
    Write-Host "✅ $FlavorName build succeeded" -ForegroundColor Green
    return $true
}

# 串行构建（Xcode 不支持并行构建同一项目）
$globalOk = $true
$chinaOk = $true

if ($Flavor -eq "all") {
    $globalOk = Build-Flavor -FlavorName "global" -BuildMethod $Method
    $chinaOk = Build-Flavor -FlavorName "china" -BuildMethod $Method
}
elseif ($Flavor -eq "global") {
    $globalOk = Build-Flavor -FlavorName "global" -BuildMethod $Method
}
elseif ($Flavor -eq "china") {
    $chinaOk = Build-Flavor -FlavorName "china" -BuildMethod $Method
}

# 汇总结果
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BUILD SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Global: $(if ($globalOk) { '✅ SUCCESS' } else { '❌ FAILED' })" -ForegroundColor $(if ($globalOk) { 'Green' } else { 'Red' })
Write-Host "  China:  $(if ($chinaOk) { '✅ SUCCESS' } else { '❌ FAILED' })" -ForegroundColor $(if ($chinaOk) { 'Green' } else { 'Red' })
```

### 7.2 Bash 构建脚本

```bash
#!/bin/bash
# build-xcode.sh
set -e

FLAVOR="${1:-global}"
METHOD="${2:-app-store}"

cd "$(dirname "$0")/ios"

# 设置环境变量
export MARKET="$FLAVOR"
export NODE_BINARY=$(which node)

# 日志配置
BUILD_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BUILD_LOG="/tmp/build-ios-${FLAVOR}-${BUILD_TIMESTAMP}.log"

echo "=== Building iOS ${FLAVOR} (${METHOD}) ==="
echo "=== Build log: $BUILD_LOG ==="

# 选择 ExportOptions.plist
EXPORT_PLIST="../ExportOptions-${METHOD}.plist"

# 执行归档
if xcodebuild \
  -workspace LinkChest.xcworkspace \
  -scheme LinkChest \
  -configuration Release \
  -archivePath "build/LinkChest-${FLAVOR}.xcarchive" \
  archive 2>&1 | tee "$BUILD_LOG"; then
    ARCHIVE_EXIT=${PIPESTATUS[0]}
else
    ARCHIVE_EXIT=${PIPESTATUS[0]}
fi

if [ $ARCHIVE_EXIT -ne 0 ]; then
    echo "❌ Archive failed"
    tail -n 50 "$BUILD_LOG"
    exit 1
fi

# 导出 IPA
if xcodebuild \
  -exportArchive \
  -archivePath "build/LinkChest-${FLAVOR}.xcarchive" \
  -exportPath "build/" \
  -exportOptionsPlist "$EXPORT_PLIST" 2>&1 | tee -a "$BUILD_LOG"; then
    EXPORT_EXIT=${PIPESTATUS[0]}
else
    EXPORT_EXIT=${PIPESTATUS[0]}
fi

if [ $EXPORT_EXIT -ne 0 ]; then
    echo "❌ Export failed"
    tail -n 50 "$BUILD_LOG"
    exit 1
fi

# 重命名产物
TIMESTAMP=$(date +"%Y%m%d-%H%M")
IPA_SOURCE="build/LinkChest.ipa"
IPA_RENAMED="build/linkchest-${FLAVOR}-${TIMESTAMP}.ipa"

if [ -f "$IPA_SOURCE" ]; then
    mv "$IPA_SOURCE" "$IPA_RENAMED"
    echo "✅ Build success: $IPA_RENAMED"
    ls -lh "$IPA_RENAMED"
else
    echo "❌ IPA not found"
    exit 1
fi
```

---

## 8. 质量监控机制

### 8.1 构建前检查清单

```
□ Xcode 版本 >= 15.0
□ macOS 版本 >= 14.0
□ CocoaPods 已安装且版本 >= 1.14
□ Apple Developer 账户有效
□ 证书未过期（剩余 > 30 天）
□ Provisioning Profile 有效
□ .env.market 文件内容正确
□ app.config.js 中 bundleIdentifier 正确
□ Info.plist 中 ATS 配置正确（国内版允许 HTTP）
□ npm 依赖已安装
□ pod 依赖已安装（Podfile.lock 与 Podfile 一致）
```

### 8.2 构建后验证

```bash
# 1. 验证 IPA 结构
unzip -l linkchest-global-20260521-1430.ipa | head -20

# 2. 验证签名
codesign -dvv LinkChest.app

# 3. 验证 entitlements
codesign -d --entitlements - LinkChest.app

# 4. 验证 Info.plist 内容
cat LinkChest.app/Info.plist | grep -A 1 "CFBundleIdentifier"
cat LinkChest.app/Info.plist | grep -A 1 "CFBundleDisplayName"

# 5. 验证 bundle 内容
cat LinkChest.app/main.jsbundle | grep "com.linkchest.app"
```

### 8.3 自动化测试集成

```bash
# 运行单元测试
xcodebuild test \
  -workspace LinkChest.xcworkspace \
  -scheme LinkChest \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

---

## 9. 风险应对预案

### 9.1 常见错误及解决方案

| 错误关键词 | 案例编号 | 原因 | 解决方案 |
|-----------|---------|------|----------|
| `No signing certificate` | IOS-001 | 证书未配置或过期 | 检查 Keychain 中的证书，重新下载 Provisioning Profile |
| `Provisioning profile doesn't match` | IOS-002 | Bundle ID 不匹配 | 检查 app.config.js 中的 bundleIdentifier 与 Profile 是否一致 |
| `CocoaPods could not find compatible versions` | IOS-003 | Pod 依赖冲突 | 执行 `pod repo update && pod install` |
| `The sandbox is not in sync with the Podfile.lock` | IOS-004 | Pod 未安装 | 执行 `pod install` |
| `error: Build input file cannot be found` | IOS-005 | 文件缺失或路径错误 | 检查文件是否存在，清理 DerivedData |
| `Multiple commands produce` | IOS-006 | 构建产物冲突 | 清理 build 目录，删除 DerivedData |
| `React Native version mismatch` | IOS-007 | RN 版本与 Pod 不匹配 | 检查 package.json 和 Podfile 中的 RN 版本 |
| `App Store Connect operation error` | IOS-008 | 上传失败 | 检查网络、Apple ID、应用状态 |
| `ITMS-90034: Missing or invalid signature` | IOS-009 | 签名错误 | 检查证书和 Provisioning Profile 匹配性 |
| `ITMS-90725: SDK version issue` | IOS-010 | SDK 版本过低 | 升级 Xcode 到最新版本 |

### 9.2 证书过期应急处理

```
证书过期告警（提前30天）
    ↓
1. 登录 Apple Developer Portal
2. Certificates → 撤销旧证书
3. 创建新证书（Distribution / Development）
4. 下载并双击安装到 Keychain
5. Provisioning Profiles → 编辑所有相关 Profile
6. 重新生成并下载 Profile
7. 更新 build-xcode.sh 中的证书引用
8. 执行测试构建验证
```

### 9.3 构建失败自动分析

```bash
# build-xcode.sh 中的错误分析逻辑
if [ $EXIT_CODE -ne 0 ]; then
    echo "=== 构建失败，启动自动分析 ==="
    
    if grep -q "No signing certificate" "$BUILD_LOG"; then
        echo "🔴 IOS-001: 证书问题"
        echo "🔧 解决: 检查 Keychain Access 中的证书"
    fi
    
    if grep -q "sandbox is not in sync" "$BUILD_LOG"; then
        echo "🔴 IOS-004: Pod 未同步"
        echo "🔧 解决: 执行 pod install"
    fi
    
    # ... 其他错误匹配
    
    tail -n 100 "$BUILD_LOG"
    exit 1
fi
```

---

## 10. App Store 审核准备

### 10.1 审核检查清单

```
□ 应用功能完整，无崩溃
□ 所有占位内容已替换（无 lorem ipsum）
□ 隐私政策链接有效
□ 应用截图符合规范（6.5寸 + 5.5寸 + iPad）
□ 应用描述准确
□ 关键词优化
□ 年龄分级正确
□ 登录功能测试通过（测试账号已提供）
□ 内购项目已配置（如有）
□ 后台功能说明（如有）
```

### 10.2 隐私合规

- **隐私政策**：必须在应用内和 App Store 页面提供
- **数据收集声明**：在 App Store Connect 中准确填写数据使用类型
- **ATT (App Tracking Transparency)**：如需跟踪用户，必须请求权限

### 10.3 国内版特殊注意

- **ICP 备案**：国内服务器需要 ICP 备案号
- **内容审核**：确保内容符合中国法律法规
- **登录方式**：国内用户可能无法使用 Google 登录，需提供替代方案

---

## 11. 与现有构建体系的整合

### 11.1 目录结构

```
project/apps/mobile/
├── build-apk.ps1          # Android 统一入口
├── build-gradle.sh        # Android 构建脚本
├── build-ios.ps1          # iOS 统一入口（新增）
├── build-xcode.sh         # iOS 构建脚本（新增）
├── ExportOptions-app-store.plist    # App Store 导出配置（新增）
├── ExportOptions-ad-hoc.plist       # Ad Hoc 导出配置（新增）
├── verify-bundle.js       # Android bundle 验证
├── verify-ios-bundle.js   # iOS bundle 验证（新增）
├── .env.market            # 市场标记文件
├── app.config.js          # Expo 配置
├── android/               # Android 项目
└── ios/                   # iOS 项目
```

### 11.2 与规则体系的关联

| 规则文件 | 关联内容 |
|----------|----------|
| BUILD_RED_LINES.md | iOS 构建红线（禁止在 Windows 构建 iOS） |
| DEPLOY_RED_LINES.md | App Store 发布红线 |
| cases/ios-build-errors.md | iOS 构建异常案例（新增） |

---

## 12. 附录

### 12.1 常用命令速查

```bash
# 清理构建产物
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData

# 重新安装 Pods
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update

# 验证签名
codesign -vv --deep --strict LinkChest.app

# 查看证书
security find-identity -v -p codesigning

# 上传 TestFlight
xcrun altool --upload-app -f LinkChest.ipa -t ios -u "apple@example.com" -p "app-specific-password"
```

### 12.2 参考文档

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Expo iOS Build Documentation](https://docs.expo.dev/build/setup/)
- [React Native iOS Build Documentation](https://reactnative.dev/docs/publishing-to-app-store)
- [fastlane iOS Documentation](https://docs.fastlane.tools/getting-started/ios/setup/)

---

*版本：v1.0*
*创建日期：2026-05-21*
*维护者：LinkChest Dev Team*
