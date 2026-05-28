---
alwaysApply: false
description: 第三方资源库 - 支付、认证、云服务等第三方服务的统一配置与调用方案
---

# THIRD-PARTY_RESOURCES.md — 第三方资源库

> LinkChest 项目所有第三方服务的统一配置管理文档。
> **修改此文档后需同步更新关联的配置文件和代码。**

---

## 1. 资源分类总览

| 分类 | 服务名称 | 海外版 | 国内版 | 配置文件 |
|------|----------|:---:|:---:|----------|
| **支付** | PayPal | ✅(Android/Web) | ❌ | `.env.global` |
| | Google Pay | ✅(Android/Web) | ❌ | `.env.global` |
| | Apple Pay | ✅(iOS/Web) | ✅(iOS/Web) | `.env.global/.env.china` |
| | Google Play Billing | ❌ | ❌ | `.env.global` |
| | 微信支付 | ❌ | ✅(Android/Web) | `.env.china` |
| | 支付宝 | ❌ | ✅(Android/Web) | `.env.china` |
| **认证** | Google OAuth | ✅(Android/iOS/Web) | ❌ | `.env.global` |
| | Apple Sign In | ✅(iOS/Web) | ✅(iOS/Web) | `.env.global/.env.china` |
| | Facebook Login | ❌ | ❌ | `.env.global` |
| | 微信登录 | ❌ | ✅(Android/iOS/Web) | `.env.china` |
| **云服务** | 腾讯云 COS | ✅ | ✅ | `.env.global/.env.china` |
| | 腾讯云 SES | ✅ | ✅ | `.env.global/.env.china` |
| | 腾讯云内容安全 | ❌ | ✅ | `.env.china` |
| **推送** | FCM (Firebase) | ✅ | ❌ | `.env.global` |
| | 极光推送 | ❌ | ✅ | `.env.china` |
| **社交分享** | 微信分享 SDK | ❌ | ✅(Android/iOS/Web) | `.env.china` |
| **邮件** | 腾讯云 SES | ✅ | ✅ | `.env.global/.env.china` |

---

## 2. 支付服务

### 2.1 PayPal（海外）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Client ID | `PAYPAL_CLIENT_ID` | https://developer.paypal.com/dashboard/applications | `apps/api/.env.global` |
| Client Secret | `PAYPAL_CLIENT_SECRET` | 同上 | 同上 |
| Webhook ID | `PAYPAL_WEBHOOK_ID` | PayPal 后台 Webhooks 配置 | 同上 |
| 订阅计划 ID | `PAYPAL_PLAN_ID_*` | PayPal 后台 Subscriptions | 同上 |

**代码位置**：`apps/api/src/providers/payment/paypal.ts`

### 2.2 Google Pay（海外）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Merchant ID | `GOOGLE_PAY_MERCHANT_ID` | https://pay.google.com/business/console | `apps/api/.env.global` |
| Merchant Name | `GOOGLE_PAY_MERCHANT_NAME` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/payment/googlePay.ts`

### 2.3 Apple Pay（跨市场）

> **当前状态**：iOS 和 Web 端启用，Android 端未启用

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Shared Secret | `APPLE_SHARED_SECRET` | https://appstoreconnect.apple.com | `apps/api/.env.global` |

**代码位置**：`apps/api/src/providers/payment/appleIAP.ts`

### 2.4 Google Play Billing（海外）

> **当前状态**：暂未启用（待实现）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Service Account Key | `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | https://play.google.com/console | `apps/api/.env.global` |
| Package Name | `GOOGLE_PLAY_PACKAGE_NAME` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/payment/googlePlayBilling.ts`

### 2.5 微信支付（国内）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| 商户号 | `WECHAT_PAY_MCH_ID` | https://pay.weixin.qq.com | `apps/api/.env.china` |
| App ID | `WECHAT_PAY_APP_ID` | 同上 | 同上 |
| API V3 Key | `WECHAT_PAY_API_V3_KEY` | 同上 | 同上 |
| 证书序列号 | `WECHAT_PAY_SERIAL_NO` | 同上 | 同上 |
| 私钥 | `WECHAT_PAY_PRIVATE_KEY` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/payment/wechatPay.ts`

### 2.6 支付宝（国内）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| App ID | `ALIPAY_APP_ID` | https://open.alipay.com | `apps/api/.env.china` |
| 私钥 | `ALIPAY_PRIVATE_KEY` | 同上 | 同上 |
| 公钥 | `ALIPAY_PUBLIC_KEY` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/payment/alipay.ts`

---

## 3. 认证服务

### 3.1 Google OAuth（海外）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Client ID | `GOOGLE_CLIENT_ID` | https://console.cloud.google.com/apis/credentials | `apps/api/.env.global` |
| Client Secret | `GOOGLE_CLIENT_SECRET` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/auth/google.ts`

### 3.2 Apple Sign In（跨市场）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Client ID | `APPLE_CLIENT_ID` | https://developer.apple.com/account/resources/identifiers/list | `apps/api/.env.global` |
| Team ID | `APPLE_TEAM_ID` | 同上 | 同上 |
| Key ID | `APPLE_KEY_ID` | 同上 | 同上 |
| Private Key | `APPLE_PRIVATE_KEY` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/auth/apple.ts`

### 3.3 Facebook Login（海外）

> **当前状态**：暂未启用（已移除，不计划启用）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| App ID | `FACEBOOK_APP_ID` | https://developers.facebook.com/apps | `apps/api/.env.global` |
| App Secret | `FACEBOOK_APP_SECRET` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/auth/facebook.ts`

### 3.4 微信登录（国内）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| App ID | `WECHAT_APP_ID` | https://open.weixin.qq.com | `apps/api/.env.china` |
| App Secret | `WECHAT_APP_SECRET` | 同上 | 同上 |

**代码位置**：`apps/api/src/providers/auth/wechat.ts`

---

## 4. 云服务

### 4.1 腾讯云 COS（跨市场）

| 配置项 | 环境变量 | 海外值 | 国内值 | 文件位置 |
|--------|----------|--------|--------|----------|
| Secret ID | `COS_SECRET_ID` | - | - | `.env.global/.env.china` |
| Secret Key | `COS_SECRET_KEY` | - | - | 同上 |
| Bucket | `COS_BUCKET` | - | - | 同上 |
| Region | `COS_REGION` | `ap-singapore` | `ap-beijing` | 同上 |

**代码位置**：`apps/api/src/services/cos.ts`

### 4.2 腾讯云 SES（跨市场）

> **邮箱注册服务**：国内外均通过腾讯云 SES 发送邮件，但使用不同的发信地址和模板

| 配置项 | 环境变量 | 海外值 | 国内值 | 获取地址 | 文件位置 |
|--------|----------|--------|--------|----------|----------|
| Secret ID | `TENCENTCLOUD_SECRET_ID` | - | - | https://console.cloud.tencent.com/cam/capi | `.env.global/.env.china` |
| Secret Key | `TENCENTCLOUD_SECRET_KEY` | - | - | 同上 | 同上 |
| Region | `SES_REGION` | `ap-hongkong` | `ap-guangzhou` | 同上 | 同上 |
| From Email | `SES_FROM_EMAIL` | `noreply@linkchest.net` | `noreply@linkchest.cn` | 同上 | 同上 |
| Verify Template ID | `SES_VERIFY_TEMPLATE_ID` | `175148` | `49526` | 同上 | 同上 |

**代码位置**：`apps/api/src/services/ses.ts`

### 4.3 腾讯云内容安全（国内）

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Secret ID | `TENCENT_SECRET_ID` | https://console.cloud.tencent.com/cms | `apps/api/.env.china` |
| Secret Key | `TENCENT_SECRET_KEY` | 同上 | 同上 |

**代码位置**：`apps/api/src/services/contentModeration.ts`

---

## 5. 推送服务

### 5.1 FCM (Firebase)（海外）

> **当前状态**：海外版移动端启用

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| Firebase Config | `FIREBASE_CONFIG` | https://console.firebase.google.com | `apps/api/.env.global` |
| Server Key | `FIREBASE_SERVER_KEY` | 同上 | 同上 |

**代码位置**：`apps/mobile/src/lib/notifications.ts`

### 5.2 极光推送（国内）

> **当前状态**：国内版移动端启用

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| AppKey | `JPUSH_APPKEY` | https://www.jiguang.cn/ | `apps/api/.env.china` |
| Master Secret | `JPUSH_MASTER_SECRET` | 同上 | 同上 |

**代码位置**：`apps/mobile/src/lib/jpush.ts`

---

## 6. 社交分享服务

### 6.1 微信分享 SDK（国内）

> **当前状态**：国内版 Android、iOS、Web 端启用

| 配置项 | 环境变量 | 获取地址 | 文件位置 |
|--------|----------|----------|----------|
| App ID | `WECHAT_SHARE_APP_ID` | https://open.weixin.qq.com | `apps/api/.env.china` |
| App Secret | `WECHAT_SHARE_APP_SECRET` | 同上 | 同上 |

**代码位置**：
- 移动端：`apps/mobile/src/lib/platforms.ts`
- Web 端：`apps/web/src/lib/api/share.ts`

---

## 7. 邮件服务

> **说明**：国内外均通过腾讯云 SES 发送邮件，详见 [4.2 腾讯云 SES（跨市场）](#42-腾讯云-ses跨市场)

---

## 8. 资源调用方案

### 8.1 Provider 懒加载模式

所有第三方服务通过统一的 Provider 接口调用，采用动态导入实现懒加载：

```typescript
// 支付 Provider 调用示例
export async function getPaymentProvider(name: PaymentSource): Promise<PaymentProvider> {
  switch (name) {
    case 'paypal': return new (await import('./paypal')).PayPalProvider()
    case 'wechat_pay': return new (await import('./wechatPay')).WechatPayProvider()
    case 'alipay': return new (await import('./alipay')).AlipayProvider()
    // ... 其他 Provider
  }
}
```

**代码位置**：`apps/api/src/providers/payment/index.ts`

### 8.2 市场守卫机制

通过 `marketGuard` 中间件确保只有当前市场启用的 Provider 可被访问：

```typescript
router.post('/api/payments/wechat', marketGuard('payment', 'wechat_pay'), handler)
```

**代码位置**：`apps/api/src/middleware/marketGuard.ts`

### 8.3 配置检测机制

每个 Provider 实现 `isConfigured()` 方法，在使用前检测配置完整性：

```typescript
class WechatPayProvider implements PaymentProvider {
  isConfigured(): boolean {
    return !!(process.env.WECHAT_PAY_MCH_ID && process.env.WECHAT_PAY_APP_ID)
  }
}
```

### 8.4 前端动态获取配置

前端通过 `/api/market/config` 接口获取当前市场的可用 Provider 列表：

```json
{
  "paymentProviders": { "wechat_pay": true, "alipay": true, "paypal": false },
  "authProviders": { "wechat": true, "google": false },
  "features": { "googleServices": false, "wechat": true }
}
```

**代码位置**：`apps/api/src/routes/market.ts`

---

## 9. 配置同步清单

修改第三方资源配置后，需同步以下文件：

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `.env.example` | 更新变量说明和默认值 |
| 2 | `apps/api/.env.global` | 海外生产配置 |
| 3 | `apps/api/.env.china` | 国内生产配置 |
| 4 | `apps/mobile/market-config.json` | 移动端市场配置 |
| 5 | `MARKET-OPS.md` | 运营方案文档 |
| 6 | `THIRD-PARTY_RESOURCES.md` | 本文件 |

---

## 10. 密钥轮换计划

| 服务 | 轮换频率 | 负责人 | 备注 |
|------|----------|--------|------|
| 支付密钥 | 每季度 | 运维 | 包含 PayPal、微信支付、支付宝 |
| OAuth 密钥 | 每季度 | 运维 | 包含 Google、Apple、微信 |
| 云服务密钥 | 每半年 | 运维 | 包含腾讯云、阿里云 |
| 推送密钥 | 每半年 | 运维 | 包含 FCM、极光推送 |

---

## 11. 服务状态监控

| 服务 | 监控指标 | 告警阈值 | 告警渠道 |
|------|----------|----------|----------|
| PayPal | API 响应时间 | > 5s | 飞书/企业微信 |
| 微信支付 | API 响应时间 | > 3s | 飞书/企业微信 |
| 支付宝 | API 响应时间 | > 3s | 飞书/企业微信 |
| 内容审核 | 审核失败率 | > 5% | 飞书/企业微信 |

---

## 12. 关联文档

- [MARKET-OPS.md](MARKET-OPS.md) — 国内外分运营配置方案
- [HIGH_RISK.md](HIGH_RISK.md) — 部署与构建安全红线
- [DEPLOYMENT.md](DEPLOYMENT.md) — 部署流程规范

---

*最后更新：2026-05-28*
*版本：v1.1 — 添加 FCM、微信分享 SDK、SES 国内外配置差异*