# LinkChest手机端海外iOS版运营配置

## 一、基础信息

| 项目 | 配置 |
|------|------|
| 品牌名称 | LinkChest |
| Bundle ID | com.linkchest.app |
| 市场标识 | global |
| 平台 | iOS |
| 构建工具 | Expo + EAS Build |

## 二、登录方式

| 方式 | 状态 | 说明 |
|------|------|------|
| 邮箱+密码 | ✅ 启用 | 主要登录方式 |
| 邮箱验证码 | ✅ 启用 | 辅助登录方式 |
| Google登录 | ✅ 启用 | 海外主流社交登录 |
| Apple登录 | ✅ 启用 | iOS原生登录 |
| 微信登录 | ❌ 禁用 | 国内版专用 |

## 三、支付方式

| 方式 | 状态 | 说明 |
|------|------|------|
| Apple Pay | ✅ 启用 | iOS原生支付 |
| Apple IAP | ✅ 启用 | 应用内购买 |
| PayPal | ❌ 不支持 | iOS端不支持 |
| Google Pay | ❌ 不适用 | Android专属 |
| 微信支付 | ❌ 禁用 | 国内支付 |
| 支付宝支付 | ❌ 禁用 | 国内支付 |

## 四、API域名

| 项目 | 配置 |
|------|------|
| API域名 | https://linkchest.net |
| 协议 | HTTPS |
| 服务器 | 43.133.44.232 |

## 五、服务集成

| 服务 | 状态 | 说明 |
|------|------|------|
| Google Services | ✅ 启用 | Firebase推送等 |
| Firebase | ✅ 启用 | 分析和推送 |
| Apple Sign In | ✅ 启用 | Apple登录 |
| 微信SDK | ❌ 禁用 | 国内版专用 |
| 支付宝SDK | ❌ 禁用 | 国内版专用 |

## 六、协议链接

| 协议 | 链接 |
|------|------|
| 用户服务协议 | https://linkchest.net/terms |
| 隐私政策 | https://linkchest.net/privacy |

## 七、构建配置

### 7.1 EAS Build配置

```json
{
  "build": {
    "production-global": {
      "autoIncrement": true,
      "env": {
        "MARKET": "global"
      },
      "ios": {
        "podsDirectory": "ios/Pods"
      }
    }
  }
}
```

### 7.2 构建命令

```bash
# 使用EAS Cloud构建
eas build --profile production-global --platform ios

# 本地构建
eas build --profile production-global --platform ios --local
```

### 7.3 app.config.js配置

```javascript
{
  expo: {
    name: 'LinkChest',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.linkchest.app',
    },
    extra: {
      market: 'global',
    },
  }
}
```

## 八、Apple配置

### 8.1 Apple Sign In

需要配置：
- Apple Developer Account
- Sign In with Apple capability
- Team ID
- Key ID
- Private Key

### 8.2 Apple IAP配置

需要配置：
- App Store Connect
- In-App Purchase products
- Shared Secret for auto-renewable subscriptions

## 九、权限配置

iOS版需要的权限：
- Camera（扫码分享）
- Photo Library（保存图片）
- Notifications（推送通知）

## 十、应用商店

| 项目 | 配置 |
|------|------|
| 应用商店 | Apple App Store |
| Bundle ID | com.linkchest.app |
| 审核要求 | 符合Apple审核指南 |
| GDPR合规 | ✅ 必须遵守 |

## 十一、更新记录

| 时间 | 更新内容 | 操作人 | 审核人 |
|------|----------|--------|--------|
| 2026-05-29 | 创建海外iOS版运营配置 | - | - |

---

**文档状态**: 初稿
**下次审核时间**: 2026-06-29
**文档负责人**: [待指定]
