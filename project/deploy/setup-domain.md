# LinkChest 域名绑定操作指南

## 前置条件

- [x] 已注册域名: `linkchest.net`
- [x] 已部署服务器: `<YOUR_SERVER_IP>` (Ubuntu 24.04)
- [x] API 服务正常运行在 `3001` 端口
- [x] Web 服务正常运行在 `3003` 端口

---

## 第一步：DNS 解析配置（域名控制台操作）

登录你的域名注册商控制台（如腾讯云、阿里云、Namecheap 等），找到 DNS 解析/DNSPod 管理页面：

添加以下 **A 记录**：

| 主机记录 | 记录类型 | 记录值 | TTL |
|---------|---------|--------|-----|
| `@` | A | `<YOUR_SERVER_IP>` | 600 |
| `www` | A | `<YOUR_SERVER_IP>` | 600 |

> **说明**: `@` 表示根域名 `linkchest.net`，`www` 表示 `www.linkchest.net`

**DNS 生效时间**: 通常 5-30 分钟，最长不超过 48 小时。

验证 DNS 是否生效：
```bash
# 在本地命令行执行
nslookup linkchest.net
# 应返回 <YOUR_SERVER_IP>
```

---

## 第二步：在服务器上执行域名绑定脚本

### 2.1 上传最新代码到服务器

在本地 PowerShell 执行：
```powershell
# 确保 deploy/nginx/linkchest.conf 和 deploy/setup-domain.sh 已上传到服务器
scp -r <LOCAL_PROJECT_PATH>\deploy\nginx ubuntu@<YOUR_SERVER_IP>:/opt/linkchest/api/deploy/
scp <LOCAL_PROJECT_PATH>\deploy\setup-domain.sh ubuntu@<YOUR_SERVER_IP>:/opt/linkchest/api/deploy/
```

### 2.2 SSH 登录服务器并执行脚本

```bash
ssh ubuntu@<YOUR_SERVER_IP>
cd /opt/linkchest/api/deploy
chmod +x setup-domain.sh
sudo ./setup-domain.sh
```

脚本会自动完成：
1. 安装 Nginx
2. 安装 Certbot (Let's Encrypt)
3. 配置 Nginx 反向代理
4. 申请 SSL 证书
5. 配置自动续期

---

## 第三步：更新 API 环境变量

SSH 登录服务器后编辑 `/opt/linkchest/api/.env`：

```bash
nano /opt/linkchest/api/.env
```

修改以下配置项：

```env
# 分享链接基础URL（改为域名）
SHARE_BASE_URL="https://linkchest.net"

# Web前端基础URL
WEB_BASE_URL="https://linkchest.net"

# CORS允许来源（添加域名，保留IP作为过渡）
CORS_ORIGIN="http://localhost:3000,http://localhost:3001,http://localhost:3003,http://<YOUR_SERVER_IP>:3001,http://<YOUR_SERVER_IP>:3003,https://linkchest.net,https://www.linkchest.net"
```

保存后重启 API 服务：
```bash
pm2 restart linkchest-api
pm2 logs linkchest-api
```

---

## 第四步：验证域名绑定

在浏览器访问：

| 地址 | 预期结果 |
|------|---------|
| `https://linkchest.net` | 显示 Web 前端首页 |
| `https://linkchest.net/api/health` | 返回 API 健康状态 JSON |
| `https://linkchest.net/s/xxx` | 分享页面（替换 xxx 为实际分享ID） |

检查 SSL 证书：
```bash
# 在服务器执行
certbot certificates

# 检查自动续期
certbot renew --dry-run
```

---

## 架构说明

绑定完成后，流量走向如下：

```
用户浏览器
    ↓
https://linkchest.net (443端口)
    ↓
Nginx (SSL终止)
    ├── /api/*  → 代理到 → 127.0.0.1:3001 (Express API)
    ├── /s/*    → 代理到 → 127.0.0.1:3001 (分享页)
    └── /*      → 代理到 → 127.0.0.1:3003 (Next.js Web)
```

---

## 常见问题

### Q1: Certbot 申请证书失败？
- 确认 DNS A 记录已生效：`nslookup linkchest.net`
- 确认服务器 80 端口对外开放（安全组 + ufw）
- 手动申请：`certbot certonly --standalone -d linkchest.net`

### Q2: Nginx 启动失败？
```bash
# 检查配置语法
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### Q3: API 返回 CORS 错误？
- 检查 `.env` 中的 `CORS_ORIGIN` 是否包含 `https://linkchest.net`
- 重启 API 服务：`pm2 restart linkchest-api`

### Q4: 如何只使用 IP 访问时仍能工作？
- 当前配置保留了对 `<YOUR_SERVER_IP>:3001` 和 `:3003` 的直接访问
- 过渡期后可关闭直接端口访问，只允许 80/443

---

## 后续移动端更新

域名绑定完成后，需要更新移动端默认 API 地址：
- 文件: `apps/mobile/src/lib/api.ts`
- 将 `DEFAULT_API_URL` 从 `http://<YOUR_SERVER_IP>:3001/api` 改为 `https://linkchest.net/api`
- 重新构建并发布 APK
