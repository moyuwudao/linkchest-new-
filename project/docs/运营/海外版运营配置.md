# LinkChest海外版运营配置

## 一、基础信息

| 项目 | 配置 |
|------|------|
| 品牌名称 | LinkChest |
| 域名 | linkchest.net |
| 服务器IP | 43.133.44.232 |
| 市场标识 | global |
| 默认语言 | English |

## 二、服务端口

| 服务 | 端口 |
|------|------|
| API服务 | 3001 |
| Web服务 | 3003 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## 三、品牌展示

| 位置 | 显示内容 | 样式 |
|------|----------|------|
| 左上角Logo旁 | LinkChest | font-bold |
| 左下角版本号 | LinkChest V1.0 | 正常 |
| 登录框标题 | LinkChest | font-bold |
| 左侧大标题 | Unlock Your Collection | 固定英文 |
| 备案信息 | 不显示 | 海外版无备案 |

## 四、认证方式

| 方式 | 状态 | 说明 |
|------|------|------|
| 邮箱+密码 | ✅ 启用 | 主要登录方式 |
| 邮箱验证码 | ✅ 启用 | 辅助登录方式 |
| Google登录 | ✅ 启用 | 海外主流社交登录 |
| Apple登录 | ✅ 启用 | iOS/macOS用户适用 |
| 微信登录 | ❌ 禁用 | 海外版不启用 |
| Facebook登录 | ❌ 已删除 | 海外版不适用 |
| 支付宝登录 | ❌ 已删除 | 海外版不适用 |

## 五、支付方式

| 方式 | 状态 | 说明 |
|------|------|------|
| PayPal | ✅ 启用 | 海外主流支付 |
| Google Pay | ✅ 启用 | 海外支付 |
| Apple IAP | ✅ 启用 | iOS内购 |
| Google Play Billing | ✅ 启用 | Android内购 |
| 微信支付 | ❌ 禁用 | 国内支付 |
| 支付宝支付 | ❌ 禁用 | 国内支付 |

## 六、邮件服务配置

| 项目 | 配置 |
|------|------|
| 服务提供商 | 腾讯云SES |
| 地域 | ap-hongkong（香港） |
| 发件邮箱 | noreply@linkchest.net |
| 验证码模板ID | 175148 |

## 七、社交平台支持

| 平台 | 状态 | 说明 |
|------|------|------|
| YouTube | ✅ 支持 | 海外视频平台 |
| Twitter/X | ✅ 支持 | 海外社交平台 |
| Instagram | ✅ 支持 | 海外社交平台 |
| B站 | ❌ 不支持 | 国内平台 |
| 小红书 | ❌ 不支持 | 国内平台 |
| 抖音 | ❌ 不支持 | 国内平台 |

## 八、合规配置

| 项目 | 配置 |
|------|------|
| 内容审核 | ❌ 不启用 |
| 实名认证 | ❌ 不启用 |
| 短信验证 | ❌ 不启用 |
| GDPR合规 | ✅ 启用（强制） |
| 数据驻留 | 全球 |

## 九、定价货币

| 项目 | 配置 |
|------|------|
| 主要货币 | USD（美元） |
| 显示人民币 | ❌ 否 |
| 显示美元 | ✅ 是 |

## 十、云服务配置

| 项目 | 配置 |
|------|------|
| 云服务商 | 腾讯云 |
| 地域 | ap-singapore（新加坡） |
| CDN域名 | 根据实际配置 |
| 对象存储 | 腾讯云COS |

## 十一、环境变量配置

```env
MARKET=global
NODE_ENV=production
PORT=3001

# 数据库
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# 腾讯云COS
COS_SECRET_ID="..."
COS_SECRET_KEY="..."
COS_BUCKET="..."
COS_REGION="ap-singapore"

# 腾讯云SES邮件
TENCENTCLOUD_SECRET_ID="..."
TENCENTCLOUD_SECRET_KEY="..."
SES_REGION="ap-hongkong"
SES_FROM_EMAIL_GLOBAL="noreply@linkchest.net"
SES_VERIFY_TEMPLATE_ID_GLOBAL="175148"

# PayPal支付
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_PLAN_ID_SANDBOX_HEAVY_MONTHLY="..."
PAYPAL_PLAN_ID_SANDBOX_HEAVY_QUARTERLY="..."
PAYPAL_PLAN_ID_SANDBOX_HEAVY_YEARLY="..."
PAYPAL_PLAN_ID_SANDBOX_SUPER_MONTHLY="..."
PAYPAL_PLAN_ID_SANDBOX_SUPER_QUARTERLY="..."
PAYPAL_PLAN_ID_SANDBOX_SUPER_YEARLY="..."
PAYPAL_PLAN_ID_PROD_HEAVY_MONTHLY="..."
PAYPAL_PLAN_ID_PROD_HEAVY_QUARTERLY="..."
PAYPAL_PLAN_ID_PROD_HEAVY_YEARLY="..."
PAYPAL_PLAN_ID_PROD_SUPER_MONTHLY="..."
PAYPAL_PLAN_ID_PROD_SUPER_QUARTERLY="..."
PAYPAL_PLAN_ID_PROD_SUPER_YEARLY="..."

# Google Pay
GOOGLE_PAY_MERCHANT_ID="..."
GOOGLE_PAY_MERCHANT_NAME="LinkChest"

# Apple IAP
APPLE_SHARED_SECRET="..."

# Google Play Billing
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY="..."
GOOGLE_PLAY_PACKAGE_NAME="com.linkchest.app"

# Google登录
GOOGLE_CLIENT_ID="..."

# Apple登录
APPLE_CLIENT_ID="..."
APPLE_TEAM_ID="..."
APPLE_KEY_ID="..."
APPLE_PRIVATE_KEY="..."

# 管理员
ADMIN_USER_IDS="..."

# 告警
ALERTING_ENABLED="true"
ALERT_SCAN_INTERVAL_MS="900000"
ALERT_EMAILS="..."
FEISHU_WEBHOOK_URL="..."
WECOM_WEBHOOK_URL="..."
```

## 十二、部署说明

### 12.1 部署流程

```bash
# 1. 拉取代码
cd /opt/linkchest/api && git pull

# 2. 安装依赖
cd project && npm install

# 3. 数据库迁移
cd apps/api && npx prisma migrate deploy

# 4. 构建API
cd apps/api && npm run build

# 5. 构建Web
cd apps/web && npm run build:raw

# 6. 重启服务
pm2 restart linkchest-api-global
pm2 restart linkchest-web-global
```

### 12.2 Nginx配置

```nginx
server {
    listen 80;
    server_name linkchest.net www.linkchest.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name linkchest.net www.linkchest.net;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 十三、备案信息

| 项目 | 说明 |
|------|------|
| ICP备案 | 海外版无需ICP备案 |
| GDPR合规 | ✅ 必须遵守欧盟通用数据保护条例 |
| 数据驻留 | 全球分布，非中国境内 |

## 十四、联系方式

| 角色 | 职责 | 联系方式 |
|------|------|----------|
| 运营负责人 | 海外运营配置维护 | [待填写] |
| 法务负责人 | GDPR合规审核 | [待填写] |
| 技术负责人 | 技术配置维护 | [待填写] |
| 产品负责人 | 产品文档维护 | [待填写] |

## 十五、文档维护

### 15.1 文档更新责任

| 文档类型 | 维护责任人 | 更新频率 |
|----------|------------|----------|
| 运营配置文档 | 运营团队 | 每月 |
| 法律合规文档 | 法务团队 | 每季度 |
| 产品文档 | 产品团队 | 每版本 |
| 技术文档 | 技术团队 | 每版本 |

### 15.2 文档审核流程

1. **创建/更新文档** → 责任人编写
2. **内部审核** → 相关部门审核
3. **法务审核** → 法务团队合规检查（重点GDPR）
4. **发布** → 正式发布并归档
5. **定期回顾** → 每季度回顾更新

## 十六、更新记录

| 时间 | 更新内容 | 操作人 | 审核人 |
|------|----------|--------|--------|
| 2026-05-29 | 删除Facebook和支付宝登录相关代码 | - | - |
| 2026-05-29 | 创建海外版运营配置文档 | - | - |

---

**文档状态**: 初稿
**下次审核时间**: 2026-06-29
**文档负责人**: [待指定]
**合规重点**: GDPR合规、数据隐私保护
