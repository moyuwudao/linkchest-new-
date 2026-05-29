---
alwaysApply: false
description: 服务构建异常案例集锦 - API、Web、Chrome扩展构建问题
---

# 服务构建异常案例集锦

> 记录 API、Web、Chrome 扩展等服务端/前端构建过程中遇到的异常及解决方案。
>
> **使用方式**：遇到构建异常时，搜索错误关键词，找到对应案例，按解决步骤执行。

---

## 案例索引

| 编号 | 问题 | 严重程度 | 频率 | 状态 |
|------|------|----------|------|------|
| [CASE-S001](#case-s001-turbo-构建失败) | Turbo 构建失败 | high | frequent | resolved |
| [CASE-S002](#case-s002-node_modules-缺失或损坏) | node_modules 缺失或损坏 | high | frequent | resolved |
| [CASE-S003](#case-s003-环境变量未加载) | 环境变量未加载 | high | occasional | resolved |
| [CASE-S004](#case-s004-类型检查失败) | 类型检查失败 | medium | frequent | resolved |
| [CASE-S005](#case-s005-依赖版本冲突) | 依赖版本冲突 | medium | occasional | resolved |
| [CASE-S006](#case-s006-chrome-扩展构建失败) | Chrome 扩展构建失败 | medium | occasional | resolved |
| [CASE-S007](#case-s007-内存不足构建崩溃) | 内存不足构建崩溃 | high | occasional | resolved |
| [CASE-S008](#case-s008-端口占用开发服务器启动失败) | 端口占用开发服务器启动失败 | low | frequent | resolved |
| [CASE-S009](#case-s009-部署后功能回退) | 部署后功能回退到旧版本 | critical | occasional | resolved |
| [CASE-S010](#case-s010-ssh-免密登录配置失败) | SSH 免密登录配置失败 | high | occasional | resolved |
| [CASE-S011](#case-s011-国内服务器git访问超时) | 国内服务器 Git 访问超时 | high | frequent | resolved |
| [CASE-S012](#case-s012-国内服务器登录功能异常) | 国内服务器登录功能异常 | critical | occasional | resolved |
| [CASE-S013](#case-s013-nginx-location-匹配顺序问题) | Nginx location匹配顺序导致静态资源404 | high | occasional | resolved |
| [CASE-S014](#case-s014-启动脚本路径错误) | 启动脚本路径错误导致服务无法启动 | critical | occasional | resolved |
| [CASE-S015](#case-s015-git-only-策略违规---国内服务器-git-remote-配置错误导致手动部署) | Git-Only 策略违规 - 国内服务器 Git Remote 配置错误导致手动部署 | high | rare | resolved |
| [CASE-S016](#case-s016-nextjs-web-server-action-错误导致登录失败) | Next.js Web Server Action 错误导致登录失败 | critical | occasional | resolved |
| [CASE-S017](#case-s017-apple-登录-clientid-类型错误) | Apple 登录 clientId 类型错误导致登录失败 | critical | occasional | resolved |

---

## CASE-S001: Turbo 构建失败

```yaml
---
id: CASE-S001
category: service-build
severity: high
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

Turbo 构建时失败，提示任务依赖错误或缓存问题：

```
error: script "build" exited with code 1
Tasks:    1 successful, 2 total
Cached:    0 cached, 2 total
```

### 根因

1. **依赖未安装**：子项目的 `node_modules` 缺失
2. **Turbo 缓存损坏**：`.turbo` 目录缓存不一致
3. **任务依赖错误**：`turbo.json` 中依赖配置有误
4. **并行构建冲突**：多个任务同时写入同一文件

### 解决

**步骤 1**：安装所有依赖
```bash
# 根目录执行
npm install

# 或强制重新安装
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

**步骤 2**：清理 Turbo 缓存
```bash
# 清理 Turbo 缓存
rm -rf .turbo
rm -rf apps/*/.turbo packages/*/.turbo
```

**步骤 3**：单独构建失败的项目
```bash
# 先构建共享包
npm run build --filter=@linkchest/shared

# 再构建具体项目
npm run build --filter=@linkchest/api
```

**步骤 4**：检查 turbo.json 配置
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    }
  }
}
```

### 预防

1. **先安装后构建**：确保 `npm install` 成功后再执行构建
2. **定期清理缓存**：每周清理一次 Turbo 缓存
3. **依赖顺序**：确保 `turbo.json` 中依赖顺序正确
4. **独立构建**：复杂项目先单独构建，确认无误后再用 Turbo

### 相关

- CASE-S002: node_modules 缺失
- CASE-S005: 依赖版本冲突

---

## CASE-S002: node_modules 缺失或损坏

```yaml
---
id: CASE-S002
category: service-build
severity: high
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

构建时提示找不到模块：

```
Error: Cannot find module 'express'
Require stack:
- /path/to/project/apps/api/src/index.ts
```

### 根因

1. **未执行 npm install**：克隆项目后未安装依赖
2. **node_modules 损坏**：部分包文件缺失或损坏
3. **monorepo 链接失效**：workspace 链接未正确建立
4. **lock 文件不一致**：`package-lock.json` 与实际安装不匹配

### 解决

**步骤 1**：重新安装依赖
```bash
# 清理所有 node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# 重新安装
npm install
```

**步骤 2**：验证 workspace 链接
```bash
# 检查共享包是否正确链接
ls -la apps/api/node_modules/@linkchest
# 应显示 shared -> ../../../packages/shared
```

**步骤 3**：如果 lock 文件有问题，重新生成
```bash
# 删除 lock 文件
rm package-lock.json

# 重新安装
npm install
```

### 预防

1. **安装检查**：构建前检查 `node_modules` 是否存在
2. **lock 文件提交**：确保 `package-lock.json` 提交到 Git
3. **CI 验证**：CI 流程中使用 `npm ci` 确保一致性
4. **定期清理**：每月清理并重新安装一次依赖

### 相关

- CASE-S001: Turbo 构建失败
- CASE-S005: 依赖版本冲突

---

## CASE-S003: 环境变量未加载

```yaml
---
id: CASE-S003
category: service-build
severity: high
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

应用启动时提示缺少环境变量：

```
Error: DATABASE_URL is required
    at validateConfig (/path/to/config.ts:15:11)
```

### 根因

1. **.env 文件缺失**：项目根目录或应用目录缺少 `.env` 文件
2. **变量名错误**：`.env` 中变量名与代码中不一致
3. **未加载 dotenv**：代码中未调用 `dotenv.config()`
4. **环境不匹配**：开发/生产环境变量配置不同

### 解决

**步骤 1**：检查 .env 文件
```bash
# 检查根目录
ls -la .env

# 检查应用目录
ls -la apps/api/.env
ls -la apps/web/.env
```

**步骤 2**：创建或修复 .env 文件
```bash
# 从示例文件复制
cp .env.example .env

# 编辑并填写实际值
nano .env
```

**步骤 3**：验证变量加载
```typescript
// 在代码入口添加调试
import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '未设置');
```

### 预防

1. **.env.example**：项目提供 `.env.example` 模板
2. **启动检查**：应用启动时验证必要环境变量
3. **文档说明**：README 中说明环境变量配置步骤
4. **类型安全**：使用 Zod 等库验证环境变量类型

### 相关

- CASE-S001: Turbo 构建失败（环境变量影响构建）

---

## CASE-S004: 类型检查失败

```yaml
---
id: CASE-S004
category: service-build
severity: medium
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

TypeScript 类型检查失败，构建中断：

```
apps/api/src/routes/user.ts:15:23 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

### 根因

1. **类型不匹配**：变量类型与实际值不匹配
2. **接口变更**：共享包的类型定义变更，使用方未更新
3. **严格模式**：`tsconfig.json` 中严格模式开启，旧代码不兼容
4. **类型定义缺失**：第三方库缺少 `@types` 包

### 解决

**步骤 1**：查看具体错误
```bash
# 运行类型检查
npm run typecheck

# 或
npx tsc --noEmit
```

**步骤 2**：修复类型错误
```typescript
// 错误示例
const id: number = req.params.id; // string 赋值给 number

// 正确修复
const id = parseInt(req.params.id, 10);
```

**步骤 3**：如果第三方库缺少类型
```bash
# 安装类型定义
npm install -D @types/express

# 或创建声明文件
echo "declare module 'some-lib';" > apps/api/src/types/some-lib.d.ts
```

**步骤 4**：临时跳过（不推荐）
```typescript
// 使用类型断言（临时方案）
const data = req.body as any;
```

### 预防

1. **IDE 检查**：使用 VS Code 等 IDE 实时类型检查
2. **pre-commit**：提交前自动运行类型检查
3. **渐进严格**：逐步开启严格模式，避免一次性大量错误
4. **共享包版本**：修改共享包类型后，同步更新所有使用方

### 相关

- CASE-S001: Turbo 构建失败（类型检查是构建的一部分）
- CASE-S005: 依赖版本冲突（类型定义版本不匹配）

---

## CASE-S005: 依赖版本冲突

```yaml
---
id: CASE-S005
category: service-build
severity: medium
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

构建时提示依赖版本冲突：

```
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Found: react@18.2.0
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^17.0.0" from some-lib@1.0.0
```

### 根因

1. **peer 依赖冲突**：不同包要求的 peer 依赖版本不兼容
2. **monorepo 版本不一致**：多个应用依赖同一包的不同版本
3. **lock 文件过期**：`package-lock.json` 未反映最新依赖关系
4. **全局安装干扰**：全局安装的包与项目依赖冲突

### 解决

**步骤 1**：使用 --legacy-peer-deps
```bash
npm install --legacy-peer-deps
```

**步骤 2**：统一 monorepo 版本
```json
// 根 package.json
{
  "dependencies": {
    "react": "^18.2.0"
  }
}

// 子 package.json 使用 workspace 协议
{
  "dependencies": {
    "react": "workspace:*"
  }
}
```

**步骤 3**：删除 lock 文件重新安装
```bash
rm package-lock.json
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

**步骤 4**：使用 overrides 强制版本
```json
{
  "overrides": {
    "react": "^18.2.0"
  }
}
```

### 预防

1. **版本统一**：monorepo 中核心依赖统一在根目录管理
2. **定期更新**：每月检查并更新依赖版本
3. **lock 文件锁定**：确保 `package-lock.json` 正确提交
4. **兼容性测试**：升级依赖前测试所有应用

### 相关

- CASE-S001: Turbo 构建失败
- CASE-S002: node_modules 缺失

---

## CASE-S006: Chrome 扩展构建失败

```yaml
---
id: CASE-S006
category: service-build
severity: medium
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

Chrome 扩展构建失败：

```
Build failed: manifest.json is required
```

### 根因

1. **manifest 缺失**：`manifest.json` 或 `manifest.ts` 文件缺失
2. **Vite 配置错误**：`vite.config.ts` 中扩展相关配置有误
3. **内容脚本路径错误**：内容脚本入口文件路径配置错误
4. **权限配置错误**：`manifest.json` 中权限声明有误

### 解决

**步骤 1**：检查 manifest 文件
```bash
ls -la apps/chrome-extension/src/manifest.ts
ls -la apps/chrome-extension/dist/manifest.json
```

**步骤 2**：验证 Vite 配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [crx({ manifest })],
});
```

**步骤 3**：检查内容脚本入口
```typescript
// manifest.ts
export default {
  manifest_version: 3,
  name: 'LinkChest Extension',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
    },
  ],
};
```

### 预防

1. **模板检查**：从模板创建时确保所有文件完整
2. **构建验证**：CI 中构建 Chrome 扩展并验证输出
3. **manifest 类型**：使用 TypeScript 定义 manifest 类型，避免配置错误
4. **测试加载**：构建后在 Chrome 开发者模式加载测试

### 相关

- CASE-S001: Turbo 构建失败

---

## CASE-S007: 内存不足构建崩溃

```yaml
---
id: CASE-S007
category: service-build
severity: high
frequency: occasional
first_seen: "2026-05-10"
last_seen: "2026-05-12"
status: resolved
---
```

### 现象

构建过程中 Node.js 进程崩溃：

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

### 根因

1. **项目过大**：monorepo 项目过多，同时构建内存不足
2. **内存泄漏**：构建工具或插件存在内存泄漏
3. **默认内存限制**：Node.js 默认内存限制（约 1.5GB）不足
4. **并行构建**：Turbo 并行构建多个项目，内存叠加

### 解决

**步骤 1**：增加 Node.js 内存限制
```bash
# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在 package.json 中
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' turbo run build"
  }
}
```

**步骤 2**：减少并行构建数
```bash
# Turbo 限制并发数
turbo run build --concurrency=2
```

**步骤 3**：单独构建大项目
```bash
# 先构建共享包
npm run build --filter=@linkchest/shared

# 再逐个构建应用
npm run build --filter=@linkchest/api
npm run build --filter=@linkchest/web
```

**步骤 4**：关闭 source map
```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": false
  }
}
```

### 预防

1. **内存监控**：构建时监控内存使用
2. **分批构建**：大项目分批构建，避免同时构建
3. **CI 配置**：CI 环境中配置足够内存
4. **代码分割**：优化代码，减少单个包体积

### 相关

- CASE-S001: Turbo 构建失败

---

## CASE-S008: 端口占用开发服务器启动失败

```yaml
---
id: CASE-S008
category: service-build
severity: low
frequency: frequent
first_seen: "2026-05-10"
last_seen: "2026-05-14"
status: resolved
---
```

### 现象

开发服务器启动失败：

```
Error: listen EADDRINUSE: address already in use :::3000
```

### 根因

1. **上次进程未退出**：上次开发服务器进程仍在运行
2. **其他应用占用**：其他应用占用了相同端口
3. **快速重启**：频繁重启导致端口未释放
4. **多实例冲突**：同时启动多个实例

### 解决

**步骤 1**：查找并杀死占用进程
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

**步骤 2**：使用不同端口
```bash
# API 使用 3000，Web 使用 3001
npm run dev -- --port 3001
```

**步骤 3**：在 package.json 中配置端口
```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

### 预防

1. **优雅退出**：确保进程退出时释放端口
2. **端口管理**：为不同服务分配固定端口
3. **启动检查**：启动前检查端口是否占用
4. **进程管理**：使用 pm2 等工具管理进程

### 相关

- CASE-S003: 环境变量未加载（端口在环境变量中配置）

---

## CASE-S009: 部署后功能回退到旧版本

```yaml
---
id: CASE-S009
category: service-build
severity: critical
frequency: occasional
first_seen: "2026-05-15"
last_seen: "2026-05-15"
status: resolved
---
```

### 现象

部署完成后，用户端显示的功能与预期不符：
- 侧边栏显示 **5 个独立入口**（收藏、分组、标签、分享、设置）
- 预期应该是 **3 个统一入口**（收藏、管理、设置）
- `/manage` 页面的 Tab 切换功能正常，但侧边栏未更新

**关键特征：**
1. 本地代码是正确的（3个入口）
2. Git 提交记录显示代码已推送
3. 服务器构建成功，无报错
4. 但实际运行的仍是旧版代码

### 根因

**服务器存在两个 Web 源码目录，部署时更新了错误的目录。**

| 目录 | 路径 | 状态 |
|------|------|------|
| 运行目录 | `/opt/linkchest/api/apps/web/` | Next.js 实际读取此目录的 `src/` |
| 更新目录 | `/opt/linkchest/api/project/apps/web/` | git pull 只更新了这里 |

**时间线：**

```
T1: 本地提交新版 Sidebar.tsx（3个入口）
    ↓
T2: git push 推送到 GitHub ✅
    ↓
T3: 服务器执行 cd /opt/linkchest/api/apps/web && git pull
    ↓ 问题！git pull 更新的是 project/apps/web/src/
    但 Next.js 读取的是 apps/web/src/
    ↓
T4: npm run build → 构建的是旧代码（5个入口）
    ↓
T5: pm2 restart → 部署完成，但运行的是旧版本
```

**为什么会有两个目录？**
- 项目从单仓库迁移到 monorepo 时，保留了旧目录结构
- `apps/web/` 是原始位置，`project/apps/web/` 是 monorepo 新结构
- 部署脚本未同步更新路径

### 解决

**步骤 1：确认问题根因**
```bash
# 在服务器上检查两个目录的差异
cd /opt/linkchest/api
diff apps/web/src/components/Sidebar.tsx project/apps/web/src/components/Sidebar.tsx
# 输出：文件内容不同 → 确认两个目录不同步
```

**步骤 2：同步源码并重新构建**
```bash
# 将新版代码复制到运行目录
cp -rf project/apps/web/src apps/web/

# 清理旧构建缓存
rm -rf apps/web/.next

# 重新构建
cd apps/web && npm run build

# 重启服务
pm2 restart linkchest-web
```

**步骤 3：验证修复结果**
```bash
# 检查运行目录的代码是否已更新
grep -A5 'menuItems' apps/web/src/components/Sidebar.tsx
# 应输出 3 个入口（collections, manage, settings）

# 检查构建产物大小
# /lists、/tags、/shares 应该变成 ~154B（重定向页面）
# /manage 应该是 ~60kB（统一管理页面）
```

### 数据影响评估

| 影响范围 | 是否受影响 | 说明 |
|----------|------------|------|
| 用户数据 | ❌ 无影响 | 本次回退仅涉及前端 UI，不涉及数据库操作 |
| API 接口 | ❌ 无影响 | API 服务独立运行，不受影响 |
| 用户会话 | ❌ 无影响 | 会话数据存储在数据库中 |
| 功能可用性 | ⚠️ 受影响 | 用户看到的是分散入口而非统一管理 |

**结论：本次回退不需要数据修复，仅需要代码同步和重新部署。**

### 预防

#### 方案 A：统一部署目录（推荐）

修改部署流程，确保只使用一个源码目录：

```bash
# deploy-web.sh（修正后）
#!/bin/bash
set -e

WEB_DIR="/opt/linkchest/api"
SRC_DIR="$WEB_DIR/project/apps/web"  # 唯一源码目录
RUN_DIR="$WEB_DIR/apps/web"         # 运行目录

echo "[1/4] 拉取最新代码..."
cd $WEB_DIR && git pull origin master

echo "[2/4] 同步源码到运行目录..."
cp -rf $SRC_DIR/src $RUN_DIR/
cp -f $SRC_DIR/package.json $RUN_DIR/
cp -f $SRC_DIR/next.config.* $RUN_DIR/ 2>/dev/null || true
cp -f $SRC_DIR/tsconfig.json $RUN_DIR/ 2>/dev/null || true

echo "[3/4] 清理缓存并构建..."
rm -rf $RUN_DIR/.next
cd $RUN_DIR && npm run build

echo "[4/4] 重启服务..."
pm2 restart linkchest-web

echo "✅ 部署完成！"

# 验证步骤
echo "🔍 验证部署结果..."
if grep -q "sidebar.manage" $RUN_DIR/src/components/Sidebar.tsx; then
    echo "✅ Sidebar 已更新为统一管理入口"
else
    echo "⚠️ 警告：Sidebar 可能未正确更新"
fi
```

#### 方案 B：添加部署校验检查点

在部署前后增加自动化校验：

```bash
# 部署前校验
pre_deploy_check() {
    echo "=== 部署前校验 ==="
    
    # 1. 检查本地和远程代码一致性
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git ls-remote origin HEAD | cut -f1)
    
    if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
        echo "⚠️ 警告：本地代码未推送到远程"
        echo "   本地: $LOCAL_HASH"
        echo "   远程: $REMOTE_HASH"
        read -p "是否继续？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 2. 检查关键文件版本
    KEY_FILE="project/apps/web/src/components/Sidebar.tsx"
    if grep -q "sidebar.manage" "$KEY_FILE"; then
        echo "✅ 关键文件已包含最新更改"
    else
        echo "❌ 关键文件可能不是最新版本"
        exit 1
    fi
    
    # 3. 备份当前运行版本（用于回滚）
    BACKUP_DIR="/opt/linkchest/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    cp -r apps/web/.next $BACKUP_DIR/ 2>/dev/null || true
    echo "📦 已备份当前构建到: $BACKUP_DIR"
}

# 部署后校验
post_deploy_check() {
    echo "=== 部署后校验 ==="
    
    # 1. 检查构建产物中的关键特征
    BUILD_MANAGE_SIZE=$(ls -la apps/web/.next/server/app/manage.html 2>/dev/null | awk '{print $5}' || echo "0")
    if [ "$BUILD_MANAGE_SIZE" -gt 50000 ]; then
        echo "✅ /manage 页面大小正常 ($((BUILD_MANAGE_SIZE/1024))kB)"
    else
        echo "❌ /manage 页面可能未正确构建 (size=$BUILD_MANAGE_SIZE)"
    fi
    
    # 2. 检查重定向页面
    for route in lists tags shares; do
        ROUTE_SIZE=$(ls -la apps/web/.next/server/app/$route.html 2>/dev/null | awk '{print $5}' || echo "0")
        if [ "$ROUTE_SIZE" -lt 1000 ]; then
            echo "✅ /$route 已变为重定向页面 (${ROUTE_SIZE}B)"
        else
            echo "⚠️ /$route 可能仍为独立页面 (${ROUTE_SIZE}B)"
        fi
    done
    
    # 3. 服务状态检查
    pm2 status linkchest-web --no-color | grep -q "online" && \
        echo "✅ 服务运行正常" || echo "❌ 服务异常"
}
```

#### 方案 C：建立符号链接（长期方案）

彻底解决双目录问题：

```bash
# 一次性配置（在服务器上执行一次）
cd /opt/linkchest/api
mv apps/web apps/web-old
ln -s project/apps/web apps/web

# 验证
ls -la apps/web
# 输出: lrwxrwxrwx ... apps/web -> project/apps/web

# 之后所有部署只需：
cd /opt/linkchest/api/project/apps/web && git pull && rm -rf .next && npm run build && pm2 restart linkchest-web
```

### 回滚策略

如果部署后发现异常：

```bash
# 1. 使用备份快速回滚
BACKUP_DIR=$(ls -dt /opt/linkchest/backups/* | head -1)
cp -r $BACKUP_DIR/.next apps/web/.next
pm2 restart linkchest-web

# 2. 或回退到上一个 Git 提交
cd /opt/linkchest/api
git log --oneline -5
git checkout <previous-commit-hash> --
# 然后按正常流程重新部署
```

### 相关

- CASE-S001: Turbo 构建失败（可能因目录混乱导致）
- CASE-S002: node_modules 缺失（多目录可能导致依赖不一致）

---

## CASE-S010: SSH 免密登录配置失败

```yaml
---
id: CASE-S010
category: service-build
severity: high
frequency: occasional
first_seen: "2026-05-21"
last_seen: "2026-05-21"
status: resolved
---
```

### 现象

执行 SSH 或 SCP 命令时卡住无输出：

```
ssh ubuntu@43.133.44.232 "whoami"
# 命令执行后终端卡住，无任何输出
```

### 根因

1. **Trae 终端限制**：Trae 终端不支持交互式密码输入，命令等待密码时会卡住
2. **SSH 密钥未配置**：服务器未配置本地公钥
3. **密钥权限错误**：`~/.ssh` 目录或 `authorized_keys` 文件权限不正确
4. **密钥格式错误**：公钥内容格式错误或不完整

### 解决

**步骤 1**：生成 SSH 密钥（本地执行）

```powershell
# 检查是否已有密钥
ls $env:USERPROFILE\.ssh\id_ed25519

# 如果没有，生成新密钥
ssh-keygen -t ed25519 -N '""' -f $env:USERPROFILE\.ssh\id_ed25519

# 查看公钥内容
cat $env:USERPROFILE\.ssh\id_ed25519.pub
```

**步骤 2**：配置服务器端（在服务器上执行）

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICedLu31sU+zVrSaZqApF3IQYneFJ2AexPw8APPSXfHM walle@changji.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**步骤 3**：配置本地 SSH 客户端

```
# 创建或编辑 ~/.ssh/config
Host 43.133.44.232
    HostName 43.133.44.232
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```

**步骤 4**：验证配置

```bash
ssh ubuntu@43.133.44.232 "whoami"
# 预期输出：ubuntu（无需输入密码）
```

### 预防

1. **部署前检查**：部署前先验证 SSH 免密登录是否配置成功
2. **权限检查**：确保 `.ssh` 目录权限为 700，`authorized_keys` 为 600
3. **配置模板**：使用统一的 SSH 配置模板
4. **日志检查**：使用 `ssh -v` 查看详细连接日志

### 相关

- CASE-S011: 国内服务器 Git 访问超时（SSH 配置影响服务器间通信）

---

## CASE-S011: 国内服务器 Git 访问超时

```yaml
---
id: CASE-S011
category: service-build
severity: high
frequency: frequent
first_seen: "2026-05-21"
last_seen: "2026-05-21"
status: resolved
---
```

### 现象

国内服务器执行 `git clone` 或 `git pull` 时超时：

```
git clone git@github.com:moyuwudao/linkchest.git
Cloning into 'linkchest'...
Connection to github.com port 22 timed out.
```

### 根因

1. **网络限制**：国内服务器访问 GitHub 速度慢，经常超时
2. **DNS 解析问题**：国内 DNS 解析 GitHub 不稳定
3. **防火墙限制**：部分服务器防火墙阻止 SSH 出站连接

### 解决

**方案 A：从海外服务器同步（推荐）**

```bash
# 在海外服务器上执行，同步到国内服务器
ssh ubuntu@43.133.44.232 "rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.turbo' /opt/linkchest/api/ ubuntu@43.136.82.88:/opt/linkchest/api_new/"

# 同步 Git 仓库
ssh ubuntu@43.133.44.232 "rsync -avz /opt/linkchest/api/.git/ ubuntu@43.136.82.88:/opt/linkchest/api_new/.git/"

# 切换目录
ssh ubuntu@43.136.82.88 "mv /opt/linkchest/api /opt/linkchest/api_old && mv /opt/linkchest/api_new /opt/linkchest/api"
```

**方案 B：使用国内镜像**

```bash
# 使用国内镜像仓库
git clone https://github.com.cnpmjs.org/moyuwudao/linkchest.git

# 或修改远程 URL
git remote set-url origin https://github.com.cnpmjs.org/moyuwudao/linkchest.git
```

**方案 C：配置 SSH 代理**

```bash
# 在国内服务器上配置代理
echo "ProxyCommand nc -X 5 -x proxy-server:port %h %p" >> ~/.ssh/config
```

### 预防

1. **镜像策略**：国内服务器使用从海外同步的策略
2. **预同步机制**：定期从海外服务器同步代码到国内
3. **备用方案**：配置多个 Git 远程地址，自动切换
4. **网络测试**：部署前测试网络连通性

### 相关

- CASE-S010: SSH 免密登录配置失败（需要 SSH 配置支持服务器间同步）

---

## CASE-S012: 国内服务器登录功能异常

```yaml
---
id: CASE-S012
category: service-build
severity: critical
frequency: occasional
first_seen: "2026-05-22"
last_seen: "2026-05-22"
status: resolved
---
```

### 现象

用户尝试登录时遇到多个错误：

1. **Google OAuth 错误**（控制台）：
   ```
   Error: Google OAuth components must be used within GoogleOAuthProvider
   ```

2. **502 Bad Gateway**：
   ```
   Failed to load resource: the server responded with a status of 502 ()
   ```

3. **API 404 错误**：
   ```
   api/auth/login-email:1 Failed to load resource: the server responded with a status of 404 ()
   ```

### 根因

**问题一：Google OAuth 组件未正确隔离**

国内版不需要 Google 登录，但代码中 `GoogleOAuthProvider` 和 `GoogleLogin` 组件在构建时被加载，即使条件渲染不显示它们。当环境变量 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 不存在时，Google 库仍然尝试初始化，导致运行时错误。

**问题二：NGINX 端口配置错误**

NGINX 配置中 proxy_pass 指向了错误的端口：
- 配置文件中设置为 `http://127.0.0.1:3000`
- 但 WEB 服务实际运行在 `3003` 端口

**问题三：NGINX 配置语法错误**

配置文件中存在错误的正则匹配块，导致 `/api/*` 请求无法正确路由到 API 服务。

### 解决

**步骤 1：修复 Google OAuth 组件隔离**

修改 `apps/web/src/app/login/page.tsx`：
```typescript
// 使用动态导入，只有在环境变量存在时才加载
const GoogleLoginButton = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  ? lazy(() => import('@/components/GoogleLoginButton'))
  : null;
```

创建独立的 `GoogleLoginButton` 组件：
```typescript
// apps/web/src/components/GoogleLoginButton.tsx
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';

export default function GoogleLoginButton({ onSuccess, onError }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <GoogleLogin onSuccess={onSuccess} onError={onError} />
    </GoogleOAuthProvider>
  );
}
```

移除 `providers.tsx` 中的全局 `GoogleOAuthProvider` 包裹。

**步骤 2：修复 NGINX 端口配置**

```nginx
# 错误配置
proxy_pass http://127.0.0.1:3000;

# 正确配置
proxy_pass http://127.0.0.1:3003;
```

**步骤 3：修复 NGINX 配置结构**

清理错误的正则匹配块，确保 `/api/` 路由正确配置：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # ... 其他配置
}
```

**步骤 4：重新构建和部署**

```bash
# 清理缓存
rm -rf .next

# 重新构建
npm run build

# 重启服务
pm2 restart linkchest-web-china

# 重新加载 NGINX
sudo nginx -s reload
```

### 预防

#### 方案 A：环境变量驱动的条件导入

在构建时根据环境变量决定是否导入特定模块：

```typescript
// 在 package.json 中使用条件脚本
{
  "scripts": {
    "build:cn": "NEXT_PUBLIC_ENABLE_GOOGLE=false npm run build",
    "build:global": "NEXT_PUBLIC_ENABLE_GOOGLE=true npm run build"
  }
}
```

#### 方案 B：构建验证检查

添加构建后验证脚本，确保正确的组件被包含/排除：

```bash
# build-verify.sh
echo "=== 构建验证 ==="

# 检查 Google 相关代码是否被正确排除
if grep -q "GoogleOAuthProvider" .next/static/chunks/*.js; then
    echo "⚠️ 警告：Google OAuth 代码未正确排除"
    if [ -z "$NEXT_PUBLIC_GOOGLE_CLIENT_ID" ]; then
        echo "❌ 错误：环境变量为空但代码仍包含 Google 组件"
        exit 1
    fi
else
    echo "✅ Google OAuth 代码已正确排除"
fi

# 验证 API 路由配置
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
if [ $? -eq 200 ]; then
    echo "✅ API 服务运行正常"
else
    echo "❌ API 服务异常"
    exit 1
fi
```

#### 方案 C：建立部署检查清单

| 检查项 | 说明 | 验证方法 |
|--------|------|----------|
| 环境变量 | 确认市场配置正确 | `cat .env.production` |
| 端口配置 | NGINX 与服务端口一致 | `grep proxy_pass nginx.conf` |
| 组件隔离 | 不需要的组件已排除 | 构建产物检查 |
| API 路由 | 关键路由可访问 | `curl /api/auth/login-email` |
| HTTPS | SSL 证书有效 | `curl -I https://domain.com` |

### 相关

- CASE-S003: 环境变量未加载（环境变量配置影响功能）
- CASE-S008: 端口占用（端口配置错误）
- CASE-S011: 国内服务器 Git 访问超时（网络环境差异）

---

## CASE-S013: Nginx location 匹配顺序问题

```yaml
---
id: CASE-S013
category: service-build
severity: high
frequency: occasional
first_seen: "2026-05-22"
last_seen: "2026-05-22"
status: resolved
---
```

### 现象

页面加载失败，静态资源返回 404 错误：

```
webpack-a1d6284ed293b183.js:1  Failed to load resource: the server responded with a status of 404 ()
main-app-b80e4828d7d67973.js:1  Failed to load resource: the server responded with a status of 404 ()
```

### 根因

Nginx `location` 匹配顺序问题：

1. **正则表达式匹配优先级高于普通前缀匹配**：`location ~* \.(css|js)$` 会先匹配到所有 `.js` 和 `.css` 文件
2. **错误的 root 配置**：正则匹配块中使用 `root /opt/linkchest/api/project/apps/web/public`，但 Next.js 的静态资源在 `.next/static/` 目录
3. **`/_next/static/` 请求被错误路由**：请求 `/next/static/chunks/webpack-xxx.js` 被正则匹配捕获，尝试从 public 目录读取，导致 404

### 解决

**步骤 1**：修改 Nginx 配置，使用 `^~` 前缀提升匹配优先级

```nginx
# 错误配置
location /_next/static/ {
    alias /opt/linkchest/api/project/apps/web/.next/static/;
}

# 正确配置：^~ 确保此规则优先于正则匹配
location ^~ /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    alias /opt/linkchest/api/project/apps/web/.next/static/;
}
```

**步骤 2**：移除或调整全局的 js/css 正则匹配块

```nginx
# 移除或限定范围
# 错误：location ~* \.(css|js)$ { ... }

# 正确：只匹配 public 目录下的静态文件
location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|json|txt|xml)$ {
    root /opt/linkchest/api/project/apps/web/public;
    try_files $uri =404;
}
```

**步骤 3**：验证配置并重新加载

```bash
sudo nginx -t
sudo nginx -s reload
```

### 预防

#### 方案 A：配置顺序检查

确保配置文件中 `/_next/static/` 规则在正则匹配块之前，或使用 `^~` 前缀：

```nginx
# 推荐配置顺序
server {
    # 1. API 路由（最高优先级）
    location /api/ { ... }
    
    # 2. 静态资源（使用 ^~ 前缀）
    location ^~ /_next/static/ { ... }
    location ^~ /static/ { ... }
    
    # 3. 特定文件类型（正则匹配，优先级最低）
    location ~* \.(png|jpg|svg)$ { ... }
    
    # 4. 兜底代理
    location / { ... }
}
```

#### 方案 B：统一静态资源处理

使用 `alias` 指令统一处理所有静态资源：

```nginx
root /opt/linkchest/api/project/apps/web;

location /_next/static/ {
    alias /opt/linkchest/api/project/apps/web/.next/static/;
    expires 1y;
}

location /static/ {
    alias /opt/linkchest/api/project/apps/web/public/static/;
    expires 1y;
}

location ~* \.(png|jpg|ico|svg)$ {
    try_files $uri /public/$uri =404;
    expires 1y;
}
```

#### 方案 C：添加配置验证脚本

```bash
#!/bin/bash
# validate-nginx-config.sh

echo "=== Nginx 配置验证 ==="

# 检查 _next/static 配置
if grep -q "^location ^~ /_next/static/" /etc/nginx/sites-enabled/linkchest; then
    echo "✅ /_next/static/ 使用了 ^~ 前缀"
else
    echo "⚠️ 警告：/_next/static/ 未使用 ^~ 前缀"
fi

# 检查 root/alias 路径
if grep -q "/opt/linkchest/api/project/apps/web/.next/static" /etc/nginx/sites-enabled/linkchest; then
    echo "✅ 静态资源路径配置正确"
else
    echo "❌ 错误：静态资源路径配置错误"
    exit 1
fi

echo "=== 验证完成 ==="
```

### 相关

- CASE-S009: 部署后功能回退（路径配置错误）
- CASE-S012: 国内服务器登录功能异常（Nginx 配置错误）

---

## CASE-S014: 启动脚本路径错误

```yaml
---
id: CASE-S014
category: service-build
severity: critical
frequency: occasional
first_seen: "2026-05-22"
last_seen: "2026-05-22"
status: resolved
---
```

### 现象

部署后页面显示旧版本内容：
- 本地代码是最新的
- Git 提交显示已推送
- 构建成功无报错
- 但页面显示的是旧版本功能

### 根因

**启动脚本指向错误的目录**：

| 目录 | 路径 | 状态 |
|------|------|------|
| 运行目录（PM2 读取） | `/opt/linkchest/api/apps/web/` | 包含旧代码 |
| 更新目录（Git pull） | `/opt/linkchest/api/project/apps/web/` | 包含新代码 |

启动脚本 `start-web.sh` 中的 `cd /opt/linkchest/api/apps/web` 指向了旧目录，导致 Next.js 加载的是旧代码。

### 解决

**步骤 1**：修改启动脚本

```bash
# 错误配置
cd /opt/linkchest/api/apps/web

# 正确配置
cd /opt/linkchest/api/project/apps/web
```

**步骤 2**：重启服务

```bash
pm2 restart linkchest-web
```

**步骤 3**：验证

```bash
# 检查服务是否加载了正确目录
pm2 show linkchest-web | grep cwd
# 应显示: /opt/linkchest/api/project/apps/web
```

### 预防

#### 方案 A：统一目录结构

```bash
# 建立符号链接，消除双目录问题
cd /opt/linkchest/api
rm -rf apps/web
ln -s project/apps/web apps/web
```

#### 方案 B：在启动脚本中添加验证

```bash
#!/bin/bash
# start-web.sh

WEB_DIR="/opt/linkchest/api/project/apps/web"

# 验证目录存在
if [ ! -d "$WEB_DIR" ]; then
    echo "❌ 错误：WEB 目录不存在: $WEB_DIR"
    exit 1
fi

# 验证构建产物
if [ ! -d "$WEB_DIR/.next" ]; then
    echo "⚠️ 警告：.next 目录不存在，正在构建..."
    cd $WEB_DIR && npm run build
fi

cd $WEB_DIR
exec node_modules/.bin/next start -p 3003
```

#### 方案 C：部署流程标准化

```bash
#!/bin/bash
# deploy-standard.sh

set -e

echo "=== 标准部署流程 ==="

# 1. 定义路径
BASE_DIR="/opt/linkchest/api"
WEB_DIR="$BASE_DIR/project/apps/web"

# 2. 拉取代码
cd $BASE_DIR && git pull origin master

# 3. 验证目录
if [ ! -d "$WEB_DIR" ]; then
    echo "❌ 错误：WEB 目录不存在"
    exit 1
fi

# 4. 构建
cd $WEB_DIR && rm -rf .next && npm run build

# 5. 重启服务
pm2 restart linkchest-web

# 6. 验证
echo "=== 部署验证 ==="
pm2 status linkchest-web | grep -q "online" && echo "✅ 服务运行正常" || echo "❌ 服务异常"
```

### 相关

- CASE-S009: 部署后功能回退（类似的目录同步问题）
- CASE-S013: Nginx location 匹配顺序问题（部署配置错误）

---

## CASE-S015: Git-Only 策略违规 - 国内服务器 Git Remote 配置错误导致手动部署

```yaml
---
id: CASE-S015
category: deployment
severity: high
frequency: rare
first_seen: "2026-05-23"
last_seen: "2026-05-23"
status: resolved
---
```

### 现象

部署国内服务器时发现：
- Git remote 配置错误：`https://github.com/walle404/linkchest.git`（应为 `git@github.com:moyuwudao/linkchest-new-.git`）
- `git pull` 无法正常工作
- 导致违规使用 `scp` 直接上传构建产物

### 根因

1. **Git Remote 配置不一致**：
   - 本地和海外服务器：`git@github.com:moyuwudao/linkchest-new-.git`
   - 国内服务器：`https://github.com/walle404/linkchest.git`（错误）

2. **违规操作**：
   - 在发现 Git 问题后，未先与用户确认，直接使用 `scp` 上传 `.next` 目录
   - 违反了 [HIGH_RISK.md §2.0 Git-Only 策略](file:///d:/trae_projects/linkchest/.trae/rules/HIGH_RISK.md#L52-L82)

### 解决

**步骤 1：修正国内服务器 Git Remote 配置**

```bash
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git remote set-url origin git@github.com:moyuwudao/linkchest-new-.git"
```

**步骤 2：更新规则文档**

在 [HIGH_RISK.md §2.0](file:///d:/trae_projects/linkchest/.trae/rules/HIGH_RISK.md#L55) 添加：
> **⚠️ 任何例外情况必须先与用户确认，不得自行决策。**

在 [INTERACTION.md §5.2](file:///d:/trae_projects/linkchest/.trae/rules/INTERACTION.md#L126) 添加：
> **⚠️ Git-Only 策略例外：任何违反 Git-Only 策略的操作（如 scp/rsync 上传代码）必须先与用户确认，不得自行决策。**

### 预防

1. **部署前验证 Git 配置**：在执行任何部署操作前，先验证所有服务器的 Git Remote 配置
2. **严格遵守确认机制**：任何违反 Git-Only 的操作，必须先与用户确认后再执行
3. **记录配置一致性**：确保所有环境的 Git Remote 配置一致

### 相关

- [HIGH_RISK.md §2.0 Git-Only 策略](file:///d:/trae_projects/linkchest/.trae/rules/HIGH_RISK.md#L52-L82)

## CASE-S016: Next.js Web Server Action 错误导致登录失败

```yaml
---
id: CASE-S016
category: service-build
severity: critical
frequency: occasional
first_seen: "2026-05-29"
last_seen: "2026-05-29"
status: resolved
---
```

### 现象

用户无法登录（海外和国内两个WEB端均受影响）：
- PM2 中 `linkchest-web` 进程反复重启（17次+）
- 内存异常偏低（18MB左右，正常应为100-140MB）
- 登录页面返回500错误
- API服务正常运行（`/api/health` 返回200，数据库/Redis正常）

**错误日志：**
```
Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
Original error: Cannot read properties of undefined (reading 'workers')
    at rv (/opt/linkchest/api/project/apps/web/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:16:1666)
```

### 根因

**WEB端构建产物与部署版本不匹配。**

| 原因 | 说明 |
|------|------|
| **构建脚本缺失** | `package.json` 中 `build` 脚本引用 `scripts/build-with-log.js`，但该文件不存在 |
| **构建产物过期** | 服务器上的 `.next/` 目录是旧版本构建的，与当前代码版本不一致 |
| **Server Action失效** | Next.js Server Action依赖构建时的哈希映射，版本不匹配时找不到对应的server action |
| **进程反复重启** | 请求处理失败导致PM2监控到异常，自动重启进程 |

**时间线：**

```
T1: 用户完成WEB端多项优化（登录页、认证、市场配置等）
    ↓
T2: 本地构建时 build-with-log.js 缺失，npm run build 报错
    ↓
T3: 但用户未推送代码到服务器，服务器仍运行旧版本构建产物
    ↓
T4: 服务器代码与构建产物版本不一致
    ↓
T5: Next.js 找不到对应的 Server Action → 登录失败
    ↓
T6: 进程反复重启，无法正常服务
```

### 解决

**步骤 1：修复本地构建脚本**

创建 `project/apps/web/scripts/build-with-log.js`：
```javascript
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../..');
const loggerPath = path.join(projectRoot, 'scripts', 'build-logger.js');

let logger;
try {
  const { BuildLogger } = require(loggerPath);
  logger = new BuildLogger({
    buildId: `web-${process.env.BUILD_FLAVOR || 'local'}-${Date.now()}`,
    flavor: process.env.BUILD_FLAVOR || 'local',
    app: 'web',
    wslInstance: 'N/A',
  });
} catch (e) {
  console.log('[build-with-log] BuildLogger not available, using console output only');
}

// ... 执行 npm install 和 next build
```

**步骤 2：提交并推送代码**

```bash
git add -A
git commit -m "修复WEB构建脚本并优化API地址"
git push
```

**步骤 3：在服务器上重新构建并部署**

```bash
# 海外服务器
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api && git pull && cd project/apps/web && npm run build && pm2 restart linkchest-web"

# 国内服务器
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git pull && cd project/apps/web && npm run build && pm2 restart linkchest-web"
```

**步骤 4：验证**

```bash
# 检查进程状态
pm2 list
# 确认 status=online, restarts 不再增加, mem > 100MB

# 检查登录页面
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3003/login
# 预期：200
```

### 预防

1. **构建前验证脚本存在性**：
   ```bash
   if [ ! -f "scripts/build-with-log.js" ]; then
       echo "❌ 错误：构建脚本不存在"
       exit 1
   fi
   ```

2. **部署后检查重启次数**：
   ```bash
   RESTART_COUNT=$(pm2 jlist | jq '.[0].restart_time')
   if [ "$RESTART_COUNT" -gt 5 ]; then
       echo "⚠️ 警告：进程重启次数过多($RESTART_COUNT)，可能需要重新构建"
   fi
   ```

3. **监控内存使用**：
   ```bash
   MEM=$(pm2 jlist | jq '.[0].monit.memory')
   if [ "$MEM" -lt 50000000 ]; then  # 小于50MB
       echo "⚠️ 警告：内存使用异常偏低(${MEM}B)，可能构建产物不匹配"
   fi
   ```

4. **定期同步构建产物**：每次代码更新后必须重新构建，不能只git pull不build

### 相关

- CASE-S009: 部署后功能回退（构建产物与代码不同步）
- CASE-S014: 启动脚本路径错误（路径配置导致加载旧代码）

## CASE-S017: Apple 登录 clientId 类型错误

```yaml
---
id: CASE-S017
category: service-build
severity: critical
frequency: occasional
first_seen: "2026-05-29"
last_seen: "2026-05-29"
status: resolved
---
```

### 现象

海外版 Apple 登录失败，国内版正常：
- 浏览器 Console 报错：`Uncaught Error: The "clientId" should be a string.`
- 页面提示：`login.appleLoginFailed`（国际化键名未翻译）
- 国内版 Apple 登录正常
- 海外版 API `/api/market/config` 返回的 `clientIds.apple` 为 `null`

**错误时间线：**

```
T1: 配置海外版 Apple Services ID (com.linkchest.app.signin)
    ↓
T2: 前端代码使用 process.env.NEXT_PUBLIC_APPLE_CLIENT_ID
    ↓
T3: Next.js 构建时环境变量未注入（服务器 .env 中无 APPLE_CLIENT_ID）
    ↓
T4: clientId 为空字符串，Apple SDK 校验失败
    ↓
T5: 报错 "clientId should be a string"
```

### 根因

**Next.js 构建时环境变量注入机制问题。**

| 原因 | 说明 |
|------|------|
| **环境变量缺失** | 海外版服务器 `.env` 文件中未配置 `APPLE_CLIENT_ID` |
| **构建时注入** | `NEXT_PUBLIC_*` 变量只在构建时注入，运行时无法动态获取 |
| **API 代码未更新** | `market.ts` 未返回 `clientIds.apple`，前端无法动态获取 |
| **编译内存不足** | 海外版服务器仅 1.9G 内存，TypeScript 编译 OOM，无法重新构建 |

**双版本差异：**

| 版本 | 环境变量 | API 返回 | 结果 |
|------|----------|----------|------|
| 国内版 | `.env.china` 有 APPLE_CLIENT_ID | `market.ts` 返回 apple | ✅ 正常 |
| 海外版 | `.env.global` 无 APPLE_CLIENT_ID | `market.ts` 未返回 apple | ❌ 失败 |

### 解决

**步骤 1：修改前端代码，支持动态获取 Apple Client ID**

```typescript
// 从 API 获取 Apple Client ID（替代构建时环境变量）
let appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
if (!appleClientId) {
  try {
    const configRes = await api.get('/market/config');
    appleClientId = configRes.data.data?.clientIds?.apple;
  } catch {
    // 忽略错误
  }
}
if (!appleClientId) {
  setError(t('login.appleLoginFailed'));
  return;
}
```

**步骤 2：修改 API 返回 Apple Client ID**

```typescript
// apps/api/src/routes/market.ts
clientIds: {
  google: process.env.GOOGLE_CLIENT_ID || null,
  wechat: wechatClientId,
  apple: process.env.APPLE_CLIENT_ID || null,  // 新增
},
```

**步骤 3：海外版服务器配置环境变量**

```bash
# 添加到海外版服务器 /opt/linkchest/api/.env
echo 'APPLE_CLIENT_ID="com.linkchest.app.signin"' >> .env
```

**步骤 4：海外版服务器直接修改编译后代码（临时方案）**

由于海外版服务器内存不足无法编译：
```bash
# 直接修改 dist/routes/market.js 添加 clientIds 返回
# 重启 API 服务
pm2 restart linkchest-api-global
```

**步骤 5：验证**

```bash
# 验证 API 返回
curl -s http://localhost:3001/api/market/config | grep -o '"apple":"[^"]*"'
# 预期："apple":"com.linkchest.app.signin"
```

### 预防

1. **统一环境变量配置**：
   - 所有服务器的 `.env` 文件必须包含相同的 OAuth 配置项
   - 使用 `.env.global` / `.env.china` 模板确保一致性

2. **前端动态获取配置**：
   - OAuth Client ID 等配置优先从 API 动态获取
   - 构建时环境变量作为降级方案

3. **部署前检查清单**：
   ```bash
   # 检查 API 返回的 clientIds 是否完整
   curl -s /api/market/config | jq '.data.clientIds'
   # 预期：google, wechat, apple 均有值或明确为 null
   ```

4. **监控内存使用**：
   - 海外版服务器 1.9G 内存不足以编译 TypeScript
   - 考虑升级服务器或使用 `tsx` 直接运行源码

### 相关

- CASE-S003: 环境变量未加载（环境变量配置问题）
- CASE-S007: 内存不足构建崩溃（海外版服务器编译问题）

---

*最后更新：2026-05-29*
*版本：v1.7 — 新增 CASE-S017 Apple 登录 clientId 类型错误*
