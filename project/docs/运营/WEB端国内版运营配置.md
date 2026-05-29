# 链藏国内版运营配置

## 一、基础信息

| 项目 | 配置 |
|------|------|
| 品牌名称 | 链藏 |
| 域名 | linkchest.cn |
| 服务器IP | 43.136.82.88 |
| 市场标识 | china |
| 默认语言 | 中文 |
| 协议 | HTTPS（已配置SSL证书） |

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
| 左上角Logo旁 | 链藏 | font-black加粗 |
| 左下角版本号 | 链藏 V1.0 | font-black加粗 |
| 登录框标题 | 链藏 | font-black加粗 |
| 左侧大标题 | 解锁你的宝库 | 固定中文 |
| 备案信息 | 右半边中间置地 | 仅国内版显示 |

## 四、认证方式

| 方式 | 状态 | 说明 |
|------|------|------|
| 邮箱+密码 | ✅ 启用 | 主要登录方式 |
| 邮箱验证码 | ✅ 启用 | 辅助登录方式 |
| 微信登录 | ✅ 启用 | 国内主流社交登录 |
| Google登录 | ❌ 禁用 | 国内版不启用 |
| Apple登录 | ✅ 启用 | iOS用户适用 |
| Facebook登录 | ❌ 已删除 | 国内版不适用 |
| 支付宝登录 | ❌ 已删除 | 国内版不适用 |

## 五、支付方式

| 方式 | 状态 | 说明 |
|------|------|------|
| 微信支付 | ✅ 启用 | 国内主流支付 |
| 支付宝支付 | ✅ 启用 | 国内主流支付 |
| PayPal | ❌ 禁用 | 海外支付 |
| Google Pay | ❌ 禁用 | 海外支付 |
| Apple IAP | ❌ 禁用 | iOS内购（国内版暂不启用） |

## 六、邮件服务配置

| 项目 | 配置 |
|------|------|
| 服务提供商 | 腾讯云SES |
| 地域 | ap-guangzhou（广州） |
| 发件邮箱 | noreply@linkchest.cn |
| 验证码模板ID | 49526 |

## 七、社交平台支持

| 平台 | 状态 | 说明 |
|------|------|------|
| B站 | ✅ 支持 | 国内视频平台 |
| 小红书 | ✅ 支持 | 国内社交平台 |
| 抖音 | ✅ 支持 | 国内短视频平台 |
| YouTube | ❌ 不支持 | 海外平台 |
| Twitter/X | ❌ 不支持 | 海外平台 |
| Instagram | ❌ 不支持 | 海外平台 |

## 八、合规配置

| 项目 | 配置 |
|------|------|
| 内容审核 | ✅ 启用（强制） |
| 实名认证 | ❌ 暂不启用 |
| 短信验证 | ❌ 暂不启用 |
| GDPR合规 | ❌ 不适用 |
| 数据驻留 | 中国境内 |

## 九、定价货币

| 项目 | 配置 |
|------|------|
| 主要货币 | CNY（人民币） |
| 显示人民币 | ✅ 是 |
| 显示美元 | ❌ 否 |

## 十、云服务配置

| 项目 | 配置 |
|------|------|
| 云服务商 | 腾讯云 |
| 地域 | ap-beijing/ap-shanghai |
| CDN域名 | 根据实际配置 |
| 对象存储 | 腾讯云COS |

## 十一、环境变量配置

```env
MARKET=china
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
COS_REGION="ap-beijing"

# 腾讯云SES邮件
TENCENTCLOUD_SECRET_ID="..."
TENCENTCLOUD_SECRET_KEY="..."
SES_REGION="ap-guangzhou"
SES_FROM_EMAIL_CN="noreply@linkchest.cn"
SES_VERIFY_TEMPLATE_ID_CN="49526"

# 微信支付
WECHAT_PAY_MCH_ID="..."
WECHAT_PAY_APP_ID="..."
WECHAT_PAY_API_V3_KEY="..."
WECHAT_PAY_SERIAL_NO="..."
WECHAT_PAY_PRIVATE_KEY="..."

# 支付宝支付
ALIPAY_APP_ID="..."
ALIPAY_PRIVATE_KEY="..."
ALIPAY_PUBLIC_KEY="..."

# 微信登录
WECHAT_APP_ID="..."
WECHAT_APP_SECRET="..."

# Apple登录
APPLE_CLIENT_ID="..."
APPLE_TEAM_ID="..."
APPLE_KEY_ID="..."
APPLE_PRIVATE_KEY="..."

# 极光推送
JPUSH_APPKEY="..."
JPUSH_MASTER_SECRET="..."

# 腾讯云内容安全
TENCENT_SECRET_ID="..."
TENCENT_SECRET_KEY="..."

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
pm2 restart linkchest-api
pm2 restart linkchest-web
```

### 12.2 Nginx配置

```nginx
server {
    listen 80;
    server_name linkchest.cn www.linkchest.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name linkchest.cn www.linkchest.cn;

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

| 项目 | 信息 |
|------|------|
| ICP备案号 | [待填写] |
| 备案主体 | [待填写] |
| 备案时间 | [待填写] |

## 十四、更新记录

| 时间 | 更新内容 | 操作人 |
|------|----------|--------|
| 2026-05-29 | 删除Facebook和支付宝登录相关代码 | - |
| 2026-05-29 | 创建国内版运营配置文档 | - |
| 2026-05-29 | 补充HTTPS协议配置说明 | - |
