---
alwaysApply: false
description: 国内外分运营配置方案 - Provider策略、市场配置、合规要求与规则联动
---

# MARKET-OPS.md — 国内外分运营配置方案

> 本文档定义 LinkChest 国内外分运营的完整配置方案，包括 Provider 架构、市场配置、合规要求、部署方式以及与项目规则的联动关系。
> **本规则 alwaysApply: false，涉及国内外运营、支付、登录、合规时加载。**

---

## 1. 架构总览

### 1.1 核心原则

```
一套核心代码 + Provider 策略模式 + 数据物理隔离
```

| 维度 | 说明 |
|------|------|
| **代码复用** | 一套代码库，通过 `MARKET` 环境变量控制差异化行为 |
| **Provider 隔离** | 支付/登录等差异模块通过统一接口 + 懒加载隔离 |
| **数据隔离** | 国内用户数据存国内数据库，海外用户数据存新加坡数据库 |
| **运行时配置** | 前端通过 `/api/market/config` 接口动态获取功能开关 |

### 1.2 市场类型

| 市场 | 标识 | 数据驻留 | 云区域 |
|------|------|----------|--------|
| 海外 | `global` | 新加坡 | `ap-singapore` |
| 国内 | `china` | 北京/上海 | `ap-beijing` |

---

## 2. 市场配置中心

### 2.1 核心文件

| 文件 | 路径 | 职责 |
|------|------|------|
| 市场配置中心 | `apps/api/src/lib/market.ts` | 集中管理所有市场差异化配置 |
| 市场守卫中间件 | `apps/api/src/middleware/marketGuard.ts` | 拦截未启用的 Provider 请求 |
| 市场配置接口 | `apps/api/src/routes/market.ts` | 前端获取市场配置的 API |
| 前端配置客户端 | `project/apps/web/src/lib/api/market.ts` | Web 端市场配置 API 客户端 |

### 2.2 市场配置对比

#### 支付渠道

| 支付 Provider | 海外 (global) | 国内 (china) | 文件 |
|---------------|:---:|:---:|------|
| PayPal | ✅ | ❌ | `providers/payment/paypal.ts` |
| Google Pay | ✅ | ❌ | `providers/payment/googlePay.ts` |
| Apple IAP | ✅ | ❌ | 待实现 |
| Google Play Billing | ✅ | ❌ | `providers/payment/googlePlayBilling.ts` |
| 微信支付 | ❌ | ✅ | `providers/payment/wechatPay.ts` |
| 支付宝 | ❌ | ✅ | `providers/payment/alipay.ts` |

#### 登录渠道

| 认证 Provider | 海外 (global) | 国内 (china) | 文件 |
|---------------|:---:|:---:|------|
| 邮箱密码 | ✅ | ✅ | `routes/auth.ts` |
| Google OAuth | ✅ | ❌ | `providers/auth/google.ts` |
| Apple Sign In | ✅ | ❌ | `providers/auth/apple.ts` |
| Facebook Login | ✅ | ❌ | 待实现 |
| 微信登录 | ❌ | ✅ | `providers/auth/wechat.ts` |
| 支付宝登录 | ❌ | ✅ | `providers/auth/alipayAuth.ts` |

#### 合规功能

| 合规项 | 海外 (global) | 国内 (china) |
|--------|:---:|:---:|
| 内容审核 | ❌ | ✅ |
| 实名认证 | ❌ | 可选 |
| 短信验证 | ❌ | ❌（当前不接入） |
| GDPR 合规 | ✅ | ❌ |
| 数据驻留 | `global` | `china` |

#### 定价与平台

| 配置项 | 海外 (global) | 国内 (china) |
|--------|---------------|--------------|
| 主货币 | USD | CNY |
| 显示人民币 | ❌ | ✅ |
| 显示美元 | ✅ | ❌ |
| B站 | ❌ | ✅ |
| 小红书 | ❌ | ✅ |
| 抖音 | ❌ | ✅ |
| YouTube | ✅ | ❌ |
| Twitter/X | ✅ | ❌ |
| Instagram | ✅ | ❌ |

---

## 3. Provider 架构

### 3.1 支付 Provider 接口

**文件**: `apps/api/src/providers/payment/types.ts`

```typescript
interface PaymentProvider {
  readonly name: PaymentSource
  isConfigured(): boolean
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult>
  verifyWebhook?(headers, body): Promise<{ valid: boolean; event }>
}

type PaymentSource = 'paypal' | 'google_pay' | 'wechat_pay' | 'alipay' | 'apple_iap' | 'google_play_billing'
```

### 3.2 认证 Provider 接口

**文件**: `apps/api/src/providers/auth/types.ts`

```typescript
interface AuthProvider {
  readonly name: AuthSource
  isConfigured(): boolean
  verifyCredential(credential: OAuthCredential): Promise<AuthResult>
}

type AuthSource = 'email' | 'google' | 'apple' | 'facebook' | 'wechat' | 'alipay_auth'
```

### 3.3 Provider 懒加载机制

**文件**: `apps/api/src/providers/payment/index.ts`、`apps/api/src/providers/auth/index.ts`

Provider 通过动态 `import()` 懒加载，未配置的 Provider 不会被打包或初始化：

```typescript
export async function getAuthProvider(name: AuthSource): Promise<AuthProvider> {
  switch (name) {
    case 'google': return new (await import('./google')).GoogleAuthProvider()
    case 'apple': return new (await import('./apple')).AppleAuthProvider()
    case 'wechat': return new (await import('./wechat')).WechatAuthProvider()
    case 'alipay_auth': return new (await import('./alipayAuth')).AlipayAuthProvider()
    default: throw new Error(`Unknown auth provider: ${name}`)
  }
}
```

### 3.4 市场守卫

**文件**: `apps/api/src/middleware/marketGuard.ts`

市场守卫中间件在路由层拦截未启用的 Provider 请求：

```typescript
// 用法：在支付/认证路由前添加守卫
router.post('/create-order', marketGuard('payment'), async (req, res) => { ... })

// 也可用于直接调用场景
const guardedFn = withMarketGuard('payment', 'wechat_pay', processPayment)
```

---

## 4. 环境变量配置

### 4.1 核心配置（必填）

| 变量 | 说明 | 示例 |
|------|------|------|
| `MARKET` | 市场标识 | `global` 或 `china` |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 签名密钥 | 32位以上随机字符串 |
| `PORT` | API 服务端口 | `3001` |

### 4.2 海外支付配置

| 变量 | Provider | 获取地址 |
|------|----------|----------|
| `PAYPAL_CLIENT_ID` | PayPal | https://developer.paypal.com/dashboard |
| `PAYPAL_CLIENT_SECRET` | PayPal | 同上 |
| `GOOGLE_PAY_MERCHANT_ID` | Google Pay | https://pay.google.com/business/console |
| `GOOGLE_PAY_MERCHANT_NAME` | Google Pay | 同上 |
| `APPLE_SHARED_SECRET` | Apple IAP | https://appstoreconnect.apple.com |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | Google Play Billing | https://play.google.com/console |
| `GOOGLE_PLAY_PACKAGE_NAME` | Google Play Billing | 同上 |

### 4.3 国内支付配置

| 变量 | Provider | 获取地址 |
|------|----------|----------|
| `WECHAT_PAY_MCH_ID` | 微信支付 | https://pay.weixin.qq.com |
| `WECHAT_PAY_APP_ID` | 微信支付 | 同上 |
| `WECHAT_PAY_API_V3_KEY` | 微信支付 | 同上 |
| `WECHAT_PAY_SERIAL_NO` | 微信支付 | 同上 |
| `WECHAT_PAY_PRIVATE_KEY` | 微信支付 | 同上 |
| `WECHAT_PAY_PLATFORM_CERT` | 微信支付 | 同上（回调签名验证） |
| `ALIPAY_APP_ID` | 支付宝 | https://open.alipay.com |
| `ALIPAY_PRIVATE_KEY` | 支付宝 | 同上 |
| `ALIPAY_PUBLIC_KEY` | 支付宝 | 同上 |

### 4.4 海外登录配置

| 变量 | Provider | 获取地址 |
|------|----------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth | https://console.cloud.google.com |
| `APPLE_CLIENT_ID` | Apple Sign In | https://developer.apple.com |
| `APPLE_TEAM_ID` | Apple Sign In | 同上 |
| `APPLE_KEY_ID` | Apple Sign In | 同上 |
| `APPLE_PRIVATE_KEY` | Apple Sign In | 同上 |
| `FACEBOOK_APP_ID` | Facebook Login | https://developers.facebook.com |
| `FACEBOOK_APP_SECRET` | Facebook Login | 同上 |

### 4.5 国内登录配置

| 变量 | Provider | 获取地址 |
|------|----------|----------|
| `WECHAT_APP_ID` | 微信登录 | https://open.weixin.qq.com |
| `WECHAT_APP_SECRET` | 微信登录 | 同上 |
| `ALIPAY_AUTH_APP_ID` | 支付宝登录 | https://open.alipay.com |
| `ALIPAY_AUTH_PRIVATE_KEY` | 支付宝登录 | 同上 |

### 4.6 合规配置

| 变量 | 用途 | 市场 |
|------|------|------|
| `TENCENTCLOUD_SECRET_ID` | 内容审核 + 邮件推送 | china |
| `TENCENTCLOUD_SECRET_KEY` | 内容审核 + 邮件推送 | china |

### 4.7 云服务配置

| 变量 | 海外默认值 | 国内默认值 |
|------|------------|------------|
| `COS_REGION` | `ap-singapore` | `ap-beijing` |
| `COS_BUCKET` | 海外桶名 | 国内桶名 |
| `COS_DOMAIN` | 海外 CDN 域名 | 国内 CDN 域名 |

---

## 5. API 路由

### 5.1 市场配置接口

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/market/config` | GET | 获取当前市场配置（前端动态适配） |

**响应结构**:

```json
{
  "success": true,
  "data": {
    "market": "china",
    "paymentProviders": { "wechat_pay": true, "alipay": true, "paypal": false },
    "authProviders": { "wechat": true, "alipay_auth": true, "google": false },
    "pricing": { "primaryCurrency": "CNY", "showCny": true, "showUsd": false },
    "platforms": { "bilibili": true, "youtube": false }
  }
}
```

### 5.2 支付路由

| 路由前缀 | Provider | 市场 |
|----------|----------|------|
| `/api/payments/paypal/*` | PayPal | global |
| `/api/payments/wechat/*` | 微信支付 | china |
| `/api/payments/alipay/*` | 支付宝 | china |

### 5.3 登录路由

| 路由 | 方法 | Provider | 市场 |
|------|------|----------|------|
| `/api/auth/login` | POST | 邮箱密码 | both |
| `/api/auth/register` | POST | 邮箱注册 | both |
| `/api/auth/google` | POST | Google OAuth | global |
| `/api/auth/apple` | POST | Apple Sign In | global |
| `/api/auth/wechat` | POST | 微信登录 | china |
| `/api/auth/alipay` | POST | 支付宝登录 | china |

---

## 6. 前端适配

### 6.1 Web 端

**登录页** (`project/apps/web/src/app/login/page.tsx`):
- ✅ 通过 `getMarketConfig()` 获取市场配置
- ✅ 根据 `authProviders.google` 动态显示 Google 登录按钮
- ✅ 根据 `authProviders.apple` 动态显示 Apple 登录按钮
- ✅ 根据 `authProviders.wechat` 动态显示微信登录按钮
- ✅ 根据 `authProviders.alipay_auth` 动态显示支付宝登录按钮
- ✅ 第三方登录区域仅在至少一个 Provider 启用时显示
- ✅ 通用 OAuth 登录处理函数 `handleOAuthLogin(provider, credential)`

**套餐升级页** (`project/apps/web/src/app/(main)/tier/upgrade/page.tsx`):
- ✅ 根据 `paymentProviders.paypal` 动态显示 PayPal 支付按钮
- ✅ 根据 `paymentProviders.wechat_pay` 动态显示微信支付按钮
- ✅ 根据 `paymentProviders.alipay` 动态显示支付宝支付按钮
- ⚠️ Google Pay 支付按钮待实现
- ⚠️ 价格显示未根据 `marketConfig.pricing` 动态切换币种

### 6.2 移动端

**登录页** (`apps/mobile/src/screens/LoginScreen.tsx`):
- ✅ 通过 `getMarketConfig()` 获取市场配置
- ✅ 根据 `authProviders.google` 动态显示 Google 登录按钮
- ✅ 根据 `authProviders.wechat` 动态显示微信登录按钮（模拟实现，需接入真实 SDK）
- ✅ 根据 `authProviders.alipay_auth` 动态显示支付宝登录按钮（模拟实现，需接入真实 SDK）
- ❌ Apple Sign In 未实现
- ❌ Google Play Billing 未实现

---

## 7. 内容审核服务

### 7.1 服务文件

**文件**: `apps/api/src/services/contentModeration.ts`

### 7.2 审核范围

| 审核对象 | 场景 | 审核时机 |
|----------|------|----------|
| 用户昵称 | 注册/修改 | 提交时 |
| 用户头像 | 上传时 | 保存前 |
| 收藏备注 | 创建/编辑 | 保存前 |
| 标签名称 | 创建时 | 保存前 |
| 分享描述 | 分享时 | 提交前 |

### 7.3 审核结果

| 等级 | 含义 | 处理方式 |
|------|------|----------|
| `PASS` | 内容正常 | 允许保存/发布 |
| `REVIEW` | 需人工审核 | 暂存待审核 |
| `BLOCK` | 内容违规 | 拒绝并提示用户 |

### 7.4 降级策略

当审核服务不可用时，默认 `PASS`，确保业务不受影响：

```typescript
} catch (err) {
  logger.error({ err: err.message }, 'Text moderation failed')
  return { result: 'PASS', suggestion: 'Moderation service unavailable' }
}
```

### 7.5 便捷调用

```typescript
import { moderateText, moderateImage } from './services/contentModeration'

const textResult = await moderateText('用户输入的文本', 'forum')
if (textResult.result === 'BLOCK') {
  return errorResponse(res, 400, 'CONTENT_BLOCKED')
}
```

---

## 8. 部署配置

### 8.1 部署脚本

**文件**: `deploy/deploy.sh`

```bash
# 部署海外版本
bash deploy/deploy.sh <服务器IP> global

# 部署国内版本
bash deploy/deploy.sh <服务器IP> china
```

### 8.2 环境变量文件

| 文件 | 用途 |
|------|------|
| `.env.global` | 海外市场生产配置 |
| `.env.china` | 国内市场生产配置 |
| `.env.development` | 开发环境配置 |

### 8.3 服务器配置

#### 国内服务器部署经验总结（2026-05-19）

> **重要**：本次国内服务器部署过程中遇到多个关键问题，总结如下，后续部署必须严格遵守。

##### 8.3.0 部署前必读

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 服务器架构确认 | 必填 | 应用层+数据层分离，确认IP和配置 |
| SSH密钥准备 | 必填 | 下载.pem密钥，设置权限600 |
| 安全组配置 | 必填 | 开放80, 3001, 5432端口，配置内网通信 |
| 域名备案状态 | 确认 | 未备案期间使用IP访问 |

##### 8.3.1 关键部署问题与解决方案

**问题1：NEXT_PUBLIC_API_URL 环境变量配置错误**

| 项目 | 内容 |
|------|------|
| **现象** | 登录按钮点击无响应，前端API请求地址错误 |
| **根因** | `NEXT_PUBLIC_*` 变量必须在构建时注入，而非运行时 |
| **错误做法** | 在PM2配置中设置 `NEXT_PUBLIC_API_URL` |
| **正确做法** | 构建前创建 `.env.production` 文件，设置 `NEXT_PUBLIC_API_URL=/api` |

```bash
# ✅ 正确：构建前注入
echo "NEXT_PUBLIC_API_URL=/api" > apps/web/.env.production
npm run build

# ❌ 错误：运行时设置无效
# PM2配置中设置 NEXT_PUBLIC_API_URL 不会生效
```

**问题2：next.config.js rewrites 配置错误**

| 项目 | 内容 |
|------|------|
| **现象** | API请求404或循环重定向 |
| **根因** | `NEXT_PUBLIC_API_URL=/api` 时，`replace(/\/api$/, '')` 返回空字符串 |
| **错误代码** | `const apiTarget = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '')` |
| **正确代码** | 检测是否为绝对路径，相对路径时跳过rewrites |

```javascript
// ✅ 正确：next.config.js rewrites配置
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const apiTarget = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : null;
  if (!apiTarget) {
    return []; // 相对路径，由Nginx处理代理
  }
  return [
    {
      source: '/api/:path*',
      destination: `${apiTarget}/api/:path*`,
    },
  ];
}
```

**问题3：静态资源未同步（public目录）**

| 项目 | 内容 |
|------|------|
| **现象** | manifest.json、logo.png 404错误 |
| **根因** | 部署脚本只同步了 `.next` 目录，遗漏 `public` 目录 |
| **正确做法** | 部署时必须同步 `public` 目录 |

```bash
# ✅ 正确：同步public目录
rsync -avz --delete "$LOCAL_WEB_DIR/public/" "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/public/"
```

**问题4：next.config.js 未同步到服务器**

| 项目 | 内容 |
|------|------|
| **现象** | 服务器上缺少next.config.js，rewrites配置不生效 |
| **根因** | 部署脚本遗漏同步next.config.js |
| **正确做法** | 部署时必须同步next.config.js |

```bash
# ✅ 正确：同步next.config.js
rsync -avz "$LOCAL_WEB_DIR/next.config.js" "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"
```

**问题5：Cookie Partitioned 属性导致登录循环**

| 项目 | 内容 |
|------|------|
| **现象** | 登录成功但立即被重定向回登录页 |
| **根因** | `Partitioned` cookie属性在HTTP环境下与Next.js Middleware不兼容 |
| **正确做法** | 移除 `Partitioned` 属性，使用标准cookie |

```typescript
// ✅ 正确：设置cookie
document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;

// ❌ 错误：Partitioned属性导致问题
document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Partitioned`;
```

**问题6：Next.js Suspense 边界问题**

| 项目 | 内容 |
|------|------|
| **现象** | 构建失败，useSearchParams必须在Suspense边界内 |
| **根因** | Next.js 14要求客户端组件使用useSearchParams时必须包裹Suspense |
| **正确做法** | 在page.tsx中包裹Suspense边界 |

```tsx
// ✅ 正确：Suspense边界
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
```

**问题7：导入路径错误**

| 项目 | 内容 |
|------|------|
| **现象** | 构建失败，找不到模块 |
| **根因** | 导入路径与实际文件路径不匹配 |
| **正确做法** | 确保导入路径与实际文件路径一致 |

```typescript
// ✅ 正确：根据实际文件路径导入
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import Logo from '@/components/Logo';

// ❌ 错误：路径不匹配
import { useI18n, Language } from '@linkchest/i18n'; // 未导出
import { useToast } from '@/components/ToastProvider'; // 文件不存在
import { Logo } from '@/components/Logo'; // 默认导出
```

##### 8.3.2 部署脚本检查清单

部署WEB前端时，必须同步以下文件：

```bash
# 必需同步的文件清单
rsync -avz --delete "$LOCAL_WEB_DIR/.next/"     "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/.next/"
rsync -avz --delete "$LOCAL_WEB_DIR/public/"     "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/public/"
rsync -avz "$LOCAL_WEB_DIR/package.json"         "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"
rsync -avz "$LOCAL_WEB_DIR/next.config.js"       "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"
rsync -avz "$LOCAL_WEB_DIR/.env.production"      "ubuntu@$SERVER_A_IP:$REMOTE_WEB_DIR/"
```

##### 8.3.3 部署验证清单

部署完成后，必须验证以下项目：

| 验证项 | 命令 | 期望结果 |
|--------|------|----------|
| WEB页面访问 | `curl http://<IP>/login` | HTTP 200 |
| API健康检查 | `curl http://<IP>/api/health` | HTTP 200 |
| 静态资源 | `curl http://<IP>/manifest.json` | HTTP 200 |
| 登录接口 | `curl -X POST http://<IP>/api/auth/login-email` | HTTP 200, 返回token |
| PM2状态 | `pm2 status` | 两个服务都online |

#### 海外服务器（单体架构）

| 配置项 | 值 |
|--------|-----|
| IP | `43.133.44.232` |
| 区域 | 新加坡 (`ap-singapore`) |
| 用户 | `ubuntu` |
| PM2 进程名 | `linkchest-api-global` |
| 端口 | `3001` |

#### 国内服务器（应用层 + 数据层分离）

| 服务器 | IP | 配置 | 用途 |
|--------|-----|------|------|
| 服务器A（应用层） | `43.136.82.88` | 4核8G5M | API + WEB + Redis + Nginx |
| 服务器B（数据层） | `114.132.81.246` | 2核4G6M | PostgreSQL 16 |

| 配置项 | 服务器A（应用层） | 服务器B（数据层） |
|--------|------------------|------------------|
| 区域 | 北京/上海 | 北京/上海 |
| 用户 | `ubuntu` | `ubuntu` |
| PM2 进程名 | `linkchest-api-china` | - |
| 端口 | `3001` | `5432` (PostgreSQL) |
| Docker | ✅ | ✅ |

#### 网络架构

```
┌─────────────────────────────────────────────────────┐
│                    互联网用户                        │
│                         │                          │
│                         ▼                          │
│              ┌──────────────────┐                  │
│              │   Nginx (43.136.82.88) │ ← 服务器A  │
│              │      (80/443)      │                  │
│              └─────────┬──────────┘                  │
│                        │                           │
│         ┌──────────────┼──────────────┐             │
│         ▼              ▼              ▼             │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│   │   API    │   │   WEB    │   │  Redis   │       │
│   │ (3001)   │   │ (3003)   │   │ (6379)   │       │
│   └────┬─────┘   └──────────┘   └──────────┘       │
│        │                                           │
│        │ 内网通信 (<1ms延迟)                        │
│        ▼                                           │
│   ┌─────────────┐                                  │
│   │ PostgreSQL  │ ← 服务器B (114.132.81.246)       │
│   │   (5432)    │                                  │
│   └─────────────┘                                  │
└─────────────────────────────────────────────────────┘
```

#### 资源分配

| 服务器A (4核8G) | 内存分配 |
|----------------|----------|
| API (Express) | 3GB |
| WEB (Next.js) | 3GB |
| Redis | 2GB |
| 系统缓冲 | 2GB (预留) |

| 服务器B (2核4G) | 配置 |
|----------------|------|
| PostgreSQL `shared_buffers` | 1GB |
| PostgreSQL `effective_cache_size` | 2GB |
| 系统缓冲 | 1GB |

### 8.4 域名配置

| 市场 | 主域名 | 状态 | 备案要求 |
|------|--------|------|----------|
| 海外 | `linkchest.net` | ✅ 已配置 | 无需备案 |
| 国内 | `linkchest.cn` | ⚠️ 待配置 | 需要 ICP 备案 |

#### DNS 解析配置

**国内域名 `linkchest.cn`**

| 记录类型 | 主机记录 | 记录值 | 说明 |
|----------|----------|--------|------|
| A | @ | `43.136.82.88` | 主域名指向应用层服务器 |
| A | www | `43.136.82.88` | www 子域名 |

#### 域名绑定脚本

| 脚本 | 路径 | 用途 |
|------|------|------|
| 海外域名配置 | `deploy/setup-domain.sh` | 配置 linkchest.net |
| 国内域名配置 | `deploy/setup-domain-cn.sh` | 配置 linkchest.cn |

#### SSL 证书

- **证书类型**: Let's Encrypt 免费证书
- **自动续期**: 已配置 cron 任务（每天凌晨2点检查）
- **证书路径**: `/etc/letsencrypt/live/linkchest.cn/`

### 8.5 数据库迁移

**迁移文件**: `apps/api/prisma/migrations/20260518_add_china_market_fields/migration.sql`

添加字段：`wechatOpenId`、`wechatUnionId`、`alipayId`、`appleId`、`authSource`、`realNameVerified` 等

---

## 9. 与项目规则的联动关系

### 9.1 规则层次

```
SOUL.md（身份与基调）
    ↓ 指导
USER.md（开发者偏好）
    ↓ 调整交互方式
INTERACTION.md（交互机制）
    ↓ 落地执行
RED_LINES.md（安全底线）+ BUILD_RED_LINES.md（构建部署红线）
    ↓ 约束
MARKET-OPS.md（本文档）→ BUILD.md（构建流程）
```

### 9.2 与安全规则 (RED_LINES.md) 的联动

| 安全规则 | 分运营联动 |
|----------|------------|
| 敏感信息保护 | 所有支付/登录密钥通过 `.env` 管理，禁止硬编码 |
| 输入验证 | 支付/登录接口使用 `express-validator` 验证 |
| SQL 注入防护 | 使用 Prisma ORM 参数化查询 |
| 日志安全 | 禁止记录密码、token、支付密钥 |
| 认证授权 | 市场守卫中间件拦截跨市场请求 |

### 9.3 与构建红线 (BUILD_RED_LINES.md) 的联动

| 构建红线 | 分运营联动 |
|----------|------------|
| APK 必须用 WSL 构建 | 国内/海外 APK 共享同一构建流程 |
| 禁止 clean | 构建缓存包含国内 Provider 依赖 |
| 部署前阅读 BUILD.md | 部署时需确认 `MARKET` 环境变量 |
| 使用部署脚本 | `deploy.sh` 已支持 `global/china` 参数 |

### 9.4 与交互规则 (INTERACTION.md) 的联动

| 交互规则 | 分运营联动 |
|----------|------------|
| 方案确认 | 新增 Provider 需给出方案对比 |
| 操作确认 | 修改 `.env` 或数据库 schema 需确认 |
| 构建阻断 | 检测到支付/部署关键词时触发阻断 |
| 部署阻断 | 部署前需确认市场类型和数据库迁移方式 |

### 9.5 触发关键词

以下关键词触发本规则加载：

- `国内`、`海外`、`china`、`global`、`市场`、`MARKET`
- `支付`、`payment`、`PayPal`、`微信支付`、`支付宝`、`Google Pay`、`Apple IAP`
- `登录`、`auth`、`OAuth`、`微信登录`、`Apple Sign In`、`Google OAuth`
- `合规`、`审核`、`内容审核`、`contentModeration`
- `Provider`、`市场守卫`、`marketGuard`

---

## 10. APK 构建校验清单（强制）

> **🔴 构建 APK 前必须逐项确认，构建后必须逐项验证。**
> **未通过校验禁止交付 APK。**

### 10.1 构建前校验

#### 10.1.1 Google 服务配置

| 检查项 | 海外版 (global) | 国内版 (china) | 验证命令 |
|--------|----------------|---------------|----------|
| Firebase App ID 真实有效 | ✅ 必填 | ❌ 不需要 | `cat google-services.json \| grep mobilesdk_app_id` |
| 包含对应包名配置 | `com.linkchest.app` | 不需要 | `cat google-services.json \| grep package_name` |
| OAuth 客户端已配置 | ✅ 必填 | ❌ 不需要 | `cat google-services.json \| grep oauth_client` |

**禁止情况：**
- ❌ `mobilesdk_app_id` 为 `0000000000000000`（占位符）
- ❌ 缺少对应包名的 `client` 配置
- ❌ `oauth_client` 为空数组

#### 10.1.2 市场配置一致性

| 检查项 | 验证方式 | 期望结果 |
|--------|----------|----------|
| `app.json` 中 `extra.market` | `cat app.json \| grep market` | 与构建目标一致，或确认 `app.config.js` 会覆盖 |
| `app.config.js` MARKET 逻辑 | 检查 `process.env.MARKET` | 构建脚本已正确设置 |
| `build-gradle.sh` MARKET 隔离 | 检查 `.env.market` 写入逻辑 | 实例隔离路径正确 |

#### 10.1.3 登录配置确认

| 版本 | 应启用 | 应禁用 | 配置文件 |
|------|--------|--------|----------|
| **国内版 (china)** | 微信登录 | 支付宝登录、Google、Apple、Facebook | `LoginScreen.tsx` 第127-133行 |
| **海外版 (global)** | Google、Facebook | 微信登录、支付宝登录 | `LoginScreen.tsx` 第134-139行 |

**注意：**
- Android 国内版不需要 Apple 登录（仅 iOS 需要）
- Web 端国内版保留微信+支付宝登录
- Web 端海外版保留 Google+Apple+Facebook 登录

#### 10.1.4 支付配置确认

| 版本 | 应启用 | 应禁用 |
|------|--------|--------|
| **国内版 (china)** | 微信支付、支付宝 | PayPal、Google Pay、Apple IAP |
| **海外版 (global)** | PayPal、Google Pay、Apple IAP | 微信支付、支付宝 |

#### 10.1.5 协议地址配置

| 协议类型 | 海外版地址 | 国内版地址 | 状态 |
|----------|-----------|-----------|------|
| 服务条款 | `https://linkchest.net/terms` | `https://linkchest.cn/terms` | 备案中 |
| 隐私政策 | `https://linkchest.net/privacy` | `https://linkchest.cn/privacy` | 备案中 |

**注意：** 国内域名 `linkchest.cn` 备案完成前，使用 IP 地址或临时域名。

### 10.2 构建后验证

#### 10.2.1 APK 文件验证

| 检查项 | 验证命令 | 期望结果 |
|--------|----------|----------|
| 文件名包含时间戳 | `ls *.apk` | `linkchest-{flavor}-YYYYMMDD-HHMM.apk` |
| 包名正确 | `aapt dump badging *.apk \| grep package` | `name='com.linkchest.app'` 或 `name='cn.linkchest.app'` |
| 应用名称正确 | `aapt dump badging *.apk \| grep application-label` | `LinkChest` 或 `链藏` |

**禁止情况：**
- ❌ APK 文件名为 `linkchest-{flavor}-release.apk`（无时间戳）
- ❌ 包名与构建目标不匹配
- ❌ 应用名称与构建目标不匹配

#### 10.2.2 Bundle 内容验证

| 检查项 | 验证命令 | 期望结果 |
|--------|----------|----------|
| 国内版不含海外域名 | `grep "linkchest.net" index.android.bundle` | 无匹配 |
| 海外版包含海外域名 | `grep "linkchest.net" index.android.bundle` | 有匹配 |
| usesCleartextTraffic（国内版） | `grep 'usesCleartextTraffic' AndroidManifest.xml` | `="true"` |

#### 10.2.3 构建产物检查清单

```bash
# 海外版验证
aapt dump badging linkchest-global-*.apk | grep package
aapt dump badging linkchest-global-*.apk | grep application-label
# 期望: package: name='com.linkchest.app'
# 期望: application-label: 'LinkChest'

# 国内版验证
aapt dump badging linkchest-china-*.apk | grep package
aapt dump badging linkchest-china-*.apk | grep application-label
# 期望: package: name='cn.linkchest.app'
# 期望: application-label: '链藏'
```

---

## 11. 新增 Provider 检查清单

添加新 Provider 时，必须完成以下步骤：

### 10.1 后端

- [ ] 在 `providers/payment/` 或 `providers/auth/` 创建 Provider 文件
- [ ] 实现 `PaymentProvider` 或 `AuthProvider` 接口
- [ ] 在 `providers/*/index.ts` 注册懒加载
- [ ] 在 `lib/market.ts` 的 `MarketFeatures` 接口和配置中添加开关
- [ ] 创建对应路由文件（支付）或在 `routes/auth.ts` 添加路由（登录）
- [ ] 在 `index.ts` 注册路由
- [ ] 在 `.env.example` 添加环境变量

### 10.2 前端

- [ ] Web 端登录页/升级页添加对应按钮
- [ ] 移动端登录页添加对应按钮
- [ ] 前端根据 `market/config` 接口动态显示/隐藏

### 10.3 安全

- [ ] 签名验证逻辑完整（webhook/回调）
- [ ] 无硬编码密钥
- [ ] 日志不记录敏感信息
- [ ] 市场守卫中间件覆盖

### 10.4 部署

- [ ] 更新 `.env.global` 或 `.env.china` 配置
- [ ] 数据库迁移（如需新字段）
- [ ] 安装新依赖（如需）

---

## 12. 维护计划

### 12.1 定期维护

| 频率 | 任务 |
|------|------|
| 每日 | 对账检查（支付账单与系统记录） |
| 每周 | 登录日志审计（异常登录行为） |
| 每月 | 依赖安全更新（`npm audit`） |
| 每季度 | 支付 API 密钥轮换、OAuth 密钥轮换 |
| 每半年 | 支付费率审查、合规检查 |
| 按需 | 微信/支付宝平台证书续期 |

### 12.2 紧急响应

```
发现问题 → 确认影响范围 → 临时修复 → 根本修复 → 验证 → 复盘
    ↓
通知相关人员
记录问题
启动降级方案（如适用）
```

---

## 13. 完整文件清单

### 13.1 后端文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 市场配置中心 | `apps/api/src/lib/market.ts` | 集中管理市场差异化配置 |
| 市场守卫中间件 | `apps/api/src/middleware/marketGuard.ts` | 拦截跨市场 Provider 请求 |
| 市场配置接口 | `apps/api/src/routes/market.ts` | 前端获取市场配置 |
| 支付 Provider 接口 | `apps/api/src/providers/payment/types.ts` | 统一支付接口定义 |
| 支付 Provider 入口 | `apps/api/src/providers/payment/index.ts` | 懒加载注册 |
| PayPal Provider | `apps/api/src/providers/payment/paypal.ts` | 海外 Web 支付 |
| Google Pay Provider | `apps/api/src/providers/payment/googlePay.ts` | 海外 Web 支付增强 |
| Google Play Billing | `apps/api/src/providers/payment/googlePlayBilling.ts` | 海外 Android IAP |
| 微信支付 Provider | `apps/api/src/providers/payment/wechatPay.ts` | 国内支付 |
| 支付宝 Provider | `apps/api/src/providers/payment/alipay.ts` | 国内支付 |
| 认证 Provider 接口 | `apps/api/src/providers/auth/types.ts` | 统一认证接口定义 |
| 认证 Provider 入口 | `apps/api/src/providers/auth/index.ts` | 懒加载注册 |
| Google OAuth | `apps/api/src/providers/auth/google.ts` | 海外登录 |
| Apple Sign In | `apps/api/src/providers/auth/apple.ts` | 海外 iOS 登录 |
| 微信登录 | `apps/api/src/providers/auth/wechat.ts` | 国内登录 |
| 支付宝登录 | `apps/api/src/providers/auth/alipayAuth.ts` | 国内登录 |
| 内容审核服务 | `apps/api/src/services/contentModeration.ts` | 国内合规审核 |
| PayPal 路由 | `apps/api/src/routes/payments/paypal.ts` | PayPal API |
| 微信支付路由 | `apps/api/src/routes/payments/wechat.ts` | 微信支付 API |
| 支付宝路由 | `apps/api/src/routes/payments/alipay.ts` | 支付宝 API |
| 登录路由 | `apps/api/src/routes/auth.ts` | 所有登录方式 |
| 数据库迁移 | `apps/api/prisma/migrations/20260518_*/migration.sql` | 国内字段迁移 |

### 13.2 前端文件

| 文件 | 路径 | 说明 |
|------|------|------|
| Web 市场配置客户端 | `project/apps/web/src/lib/api/market.ts` | API 客户端 |
| Web 登录页 | `project/apps/web/src/app/login/page.tsx` | 动态登录按钮 |
| Web 升级页 | `project/apps/web/src/app/(main)/tier/upgrade/page.tsx` | 动态支付按钮 |
| 移动端 API 客户端 | `apps/mobile/src/lib/api.ts` | MarketConfig 类型 |
| 移动端登录页 | `apps/mobile/src/screens/LoginScreen.tsx` | 动态登录按钮 |

### 13.3 配置文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 环境变量示例 | `.env.example` | 所有环境变量模板 |
| 部署脚本 | `deploy/deploy.sh` | 支持 global/china 参数 |
| Prisma Schema | `apps/api/prisma/schema.prisma` | 国内字段定义 |

---

*最后更新：2026-05-26*
*版本：v1.2（新增APK构建校验清单、登录配置校验、协议地址配置）*
