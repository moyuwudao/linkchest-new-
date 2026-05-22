# LinkChest API 部署指南

## 服务器信息
- IP: `<YOUR_SERVER_IP>`
- OS: Ubuntu 24.04 LTS
- 登录: SSH 密钥或密码登录
- 数据库: PostgreSQL 16 (Docker 容器 `linkchest-db`)

---

## 第一步：服务器初始化（仅需一次）

在本地终端执行 SSH 登录：
```bash
ssh ubuntu@<YOUR_SERVER_IP>
```

登录后执行以下命令：

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 3. 安装 Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. 安装 pm2 进程管理器
npm install -g pm2
pm2 startup

# 5. 配置防火墙（开放 API 端口）
ufw allow 22/tcp
ufw allow 3001/tcp
ufw allow 3003/tcp
ufw --force enable

# 6. 创建应用目录
mkdir -p /opt/linkchest/api/data

# 7. 配置 pm2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 退出服务器
exit
```

---

## 第二步：部署代码到服务器

在本地 PowerShell 执行：

```powershell
# 1. 上传整个项目
scp -r <LOCAL_PROJECT_PATH> ubuntu@<YOUR_SERVER_IP>:/opt/linkchest/api

# 2. 上传生产环境配置
scp <LOCAL_PROJECT_PATH>\deploy\.env.production ubuntu@<YOUR_SERVER_IP>:/opt/linkchest/api/.env
```

---

## 第三步：初始化 PostgreSQL

SSH 登录服务器后执行：

```bash
cd /opt/linkchest/api

# 运行 PostgreSQL 初始化脚本
bash deploy/setup-postgres.sh
```

该脚本会自动：
1. 检查 Docker
2. 启动 PostgreSQL 容器
3. 配置环境变量
4. 安装依赖并生成 Prisma Client
5. 执行数据库迁移

---

## 第四步：启动 API 服务

```bash
cd /opt/linkchest/api/apps/api

# 安装生产依赖
npm install --production

# 启动服务
NODE_ENV=production pm2 start npx --name linkchest-api -- tsx src/index.ts

# 保存进程列表（开机自启）
pm2 save

# 验证服务
curl http://localhost:3001/health
```

---

## 数据库管理

### 备份
```bash
# 手动备份
docker exec linkchest-db pg_dump -U linkchest linkchest > backup.sql

# 设置每日自动备份 (凌晨3点)
crontab -e
# 添加: 0 3 * * * /opt/linkchest/api/deploy/backup-db.sh
```

### 恢复
```bash
# 从备份恢复
cat backup.sql | docker exec -i linkchest-db psql -U linkchest linkchest
```

### 连接信息
- Host: `localhost` (容器间用 `postgres`)
- Port: `5432`
- User: `linkchest`
- Password: `<YOUR_DB_PASSWORD>`
- DB: `linkchest`

### 进入 PostgreSQL 命令行
```bash
docker exec -it linkchest-db psql -U linkchest
```

---

## 常用运维命令

```bash
# SSH 登录
ssh ubuntu@<YOUR_SERVER_IP>

# 查看日志
pm2 logs linkchest-api

# 重启服务
pm2 restart linkchest-api

# 查看状态
pm2 status

# 一键更新部署
cd /opt/linkchest/api && bash deploy/update.sh

# 查看 PostgreSQL 容器状态
docker ps | grep linkchest-db

# 查看 PostgreSQL 日志
docker logs linkchest-db
```

---

## 腾讯云安全组配置

除了服务器本身的 ufw 防火墙，还需要在 **腾讯云控制台** 配置安全组规则：

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云服务器 → 安全组**
3. 找到该服务器绑定的安全组
4. 添加入站规则：
   - 协议: TCP, 端口: 3001, 来源: 0.0.0.0/0, 策略: 允许
   - 协议: TCP, 端口: 3003, 来源: 0.0.0.0/0, 策略: 允许

⚠️ **PostgreSQL 5432 端口不需要对外开放！API 通过容器内部网络或 localhost 连接。**

---

---

## 运维监控后台（Admin）

### 访问地址
部署后，管理员可通过 Web 前端 `/admin` 路径访问运维后台：
```
https://linkchest.net/admin
```

### 配置管理员权限

1. 从数据库获取管理员用户的 UUID：
```bash
# 查询所有用户
docker exec -it linkchest-db psql -U linkchest -c "SELECT id, email, nickname FROM users;"

# 或按邮箱精确查询
docker exec -it linkchest-db psql -U linkchest -c "SELECT id, email, nickname, auth_source FROM users WHERE email = 'qishao789@gmail.com';"
```

2. 将 UUID 填入 `.env` 的 `ADMIN_USER_IDS`：
```bash
ADMIN_USER_IDS="uuid-1,uuid-2"
```

3. 重启 API 服务生效：
```bash
pm2 restart linkchest-api
```

### 告警推送配置（可选）

在 `.env` 中配置以下环境变量启用告警：
```bash
# 告警总开关
ALERTING_ENABLED="true"

# 告警接收邮箱（逗号分隔）
ALERT_EMAILS="admin@linkchest.net"

# 飞书 Webhook（P0/P1/P2 会推送）
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

# 企业微信 Webhook（P0/P2 会推送）
WECOM_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
```

告警分级推送策略：
- **P0 紧急**（服务宕机、错误率>50%）：邮件 + 飞书 + 企微
- **P1 严重**（错误率>10%、响应时间>5s）：邮件 + 飞书
- **P2 一般**（错误数/响应时间阈值）：飞书 + 企微
- **P3 提示**：仅记录，不推送

扫描间隔固定为 **15 分钟**，支持冷却期和静默时段配置。

### 首次部署/更新时需执行的数据库迁移

如果 `error_events`、`alert_rules`、`alert_history` 表尚未创建：
```bash
cd /opt/linkchest/api/apps/api
npx prisma migrate deploy
# 或手动执行迁移SQL
docker exec -i linkchest-db psql -U linkchest linkchest < prisma/migrations/20260427_add_monitoring_tables/migration.sql
```

---

## 后续更新部署流程

代码修改后，在本地执行：

```powershell
# 方式1: 完整更新（推荐）
ssh ubuntu@<YOUR_SERVER_IP> "cd /opt/linkchest/api && git pull && bash deploy/update.sh"

# 方式2: 手动更新
cd <LOCAL_PROJECT_PATH>\apps\api
# 上传并重启
scp -r dist/ ubuntu@<YOUR_SERVER_IP>:/opt/linkchest/api/apps/api/
ssh ubuntu@<YOUR_SERVER_IP> "cd /opt/linkchest/api/apps/api && pm2 restart linkchest-api"
```
