# 链藏手机端国内iOS版运营配置

## 一、基础信息

| 项目 | 配置 |
|------|------|
| 品牌名称 | 链藏 |
| Bundle ID | com.linkchest.app（与软著登记一致，国内外版统一） |
| 市场标识 | china |
| 平台 | iOS |
| 构建工具 | Expo + EAS Build |

## 二、登录方式

| 方式 | 状态 | 说明 |
|------|------|------|
| 邮箱+密码 | ✅ 启用 | 主要登录方式 |
| 邮箱验证码 | ✅ 启用 | 辅助登录方式 |
| 微信登录 | ✅ 启用 | 国内主流社交登录 |
| Apple登录 | ✅ 启用 | iOS原生登录（Apple要求） |
| Google登录 | ❌ 禁用 | 海外版专用 |

## 三、支付方式

| 方式 | 状态 | 说明 |
|------|------|------|
| Apple Pay | ✅ 启用 | iOS原生支付 |
| Apple IAP | ✅ 启用 | 应用内购买（Apple要求） |
| 微信支付 | ❌ 不支持 | iOS端暂不支持 |
| 支付宝支付 | ❌ 不支持 | iOS端暂不支持 |
| Google Pay | ❌ 不适用 | Android专属 |
| PayPal | ❌ 禁用 | 海外支付 |

## 四、API域名

| 项目 | 配置 |
|------|------|
| API域名 | https://linkchest.cn |
| 协议 | HTTPS（国内服务器已配置SSL证书） |
| 服务器 | 43.136.82.88 |

## 五、服务集成

| 服务 | 状态 | 说明 |
|------|------|------|
| Google Services | ❌ 禁用 | 国内不可用 |
| Firebase | ❌ 禁用 | 国内不可用 |
| Apple Sign In | ✅ 启用 | Apple登录 |
| 微信SDK | ✅ 启用 | 微信登录和分享 |
| 支付宝SDK | ❌ 禁用 | iOS端暂不支持 |

## 六、协议链接

| 协议 | 链接 |
|------|------|
| 用户服务协议 | https://linkchest.cn/terms |
| 隐私政策 | https://linkchest.cn/privacy |

## 七、构建配置

### 7.1 EAS Build配置

```json
{
  "build": {
    "production-china": {
      "autoIncrement": true,
      "env": {
        "MARKET": "china"
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
eas build --profile production-china --platform ios

# 本地构建
eas build --profile production-china --platform ios --local
```

### 7.3 app.config.js配置

```javascript
{
  expo: {
    name: '链藏',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.linkchest.app',
    },
    extra: {
      market: 'china',
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

## 九、微信SDK配置

### 9.1 微信开放平台

需要配置：
- 微信开放平台应用
- App ID
- App Secret
- Universal Links
- Bundle ID（com.linkchest.app，与软著登记一致）

## 十、权限配置

iOS版需要的权限：
- Camera（扫码分享）
- Photo Library（保存图片）
- Notifications（推送通知）

## 十一、应用商店

| 项目 | 配置 |
|------|------|
| 应用商店 | Apple App Store（中国区） |
| Bundle ID | com.linkchest.app（与软著登记一致，国内外版统一） |
| 审核要求 | 符合Apple审核指南 |
| ICP备案 | 必须（中国区App Store要求） |
| 软著登记 | 必须 |

## 十二、合规要求

| 项目 | 要求 | 状态 |
|------|------|------|
| ICP备案 | 必须 | ⚠️ 待填写 |
| 软著登记 | 必须 | ✅ 已完成 |
| 隐私政策 | 必须展示 | ✅ 已完成 |
| 用户协议 | 必须展示 | ✅ 已完成 |
| Apple审核 | 必须符合 | ⚠️ 待确认 |
| 内容审核 | 必须启用 | ✅ 已配置 |

## 十三、更新记录

| 时间 | 更新内容 | 操作人 | 审核人 |
|------|----------|--------|--------|
| 2026-05-29 | 创建国内iOS版运营配置 | - | - |
| 2026-05-29 | 修正API协议为HTTPS | - | - |

---

**文档状态**: 初稿
**下次审核时间**: 2026-06-29
**文档负责人**: [待指定]
