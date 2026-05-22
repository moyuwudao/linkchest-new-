# LinkChest 认证系统文档

## 架构概述

采用 **JWT + localStorage** 的简化认证方案，不依赖任何状态管理库（已移除 zustand）。

## 核心文件

### 1. 认证工具 (`src/lib/auth.ts`)

纯函数，直接操作 localStorage：

```typescript
// Token 管理
getToken(): string | null
setToken(token: string): void
removeToken(): void

// 用户信息管理
getUser(): any | null
setUser(user: any): void
removeUser(): void

// 状态检查
isLoggedIn(): boolean

// 退出登录
logout(): void  // 清除数据并跳转 /login
```

### 2. API 客户端 (`src/lib/api.ts`)

Axios 实例，自动处理认证：

- **请求拦截器**: 自动从 localStorage 读取 token，添加 `Authorization: Bearer ${token}` 头
- **响应拦截器**: 401 状态码时自动调用 `logout()` 跳转登录页

### 3. 路由守卫 (`src/components/AuthGuard.tsx`)

统一处理路由保护：

- 公开路径：`/login`, `/s/*`（分享页面）
- 其他路径：检查 `isLoggedIn()`，未登录则重定向到 `/login`
- 显示加载状态避免闪烁

### 4. 全局 Provider (`src/app/providers.tsx`)

```
QueryClientProvider
  └── AuthGuard
        └── children (页面内容)
```

## 认证流程

### 登录流程
1. 用户访问 `/login`
2. 输入手机号 → 获取验证码 → 提交登录
3. 登录成功：
   - `setToken(token)` 存 localStorage
   - `setUser(user)` 存用户信息
   - `router.replace('/')` 跳转首页

### 访问受保护页面
1. 进入页面时 `AuthGuard` 检查 `isLoggedIn()`
2. 已登录：正常显示
3. 未登录：`router.replace('/login')`

### API 请求
1. 请求前拦截器读取 localStorage 中的 token
2. 自动添加 `Authorization: Bearer ${token}` 头
3. 401 响应时自动 `logout()`

### 退出登录
1. 点击退出登录按钮
2. 调用 `logout()`：
   - `removeToken()`
   - `removeUser()`
   - `window.location.href = '/login'`

## 页面结构

```
src/
├── app/
│   ├── login/page.tsx          # 登录页（公开）
│   ├── page.tsx                # 首页（需登录）
│   ├── add/page.tsx            # 添加收藏（需登录）
│   ├── edit/[id]/page.tsx      # 编辑收藏（需登录）
│   ├── lists/page.tsx          # 列表管理（需登录）
│   ├── lists/[id]/page.tsx     # 列表详情（需登录）
│   ├── tags/page.tsx           # 标签管理（需登录）
│   ├── tags/[id]/page.tsx      # 标签详情（需登录）
│   ├── shares/page.tsx         # 分享管理（需登录）
│   ├── shares/create/page.tsx  # 创建分享（需登录）
│   ├── s/[shareId]/page.tsx    # 公开分享页（公开）
│   ├── layout.tsx              # 根布局
│   └── providers.tsx           # 全局 Provider
├── components/
│   ├── AuthGuard.tsx           # 路由守卫
│   ├── Sidebar.tsx             # 侧边栏（含退出登录）
│   └── CollectionList.tsx      # 收藏列表
└── lib/
    ├── auth.ts                 # 认证工具
    ├── api.ts                  # API 客户端
    └── utils.ts                # 工具函数
```

## 已删除的代码

- ❌ `src/store/` 目录（空目录）
- ❌ `zustand` 依赖（package.json）

## 依赖列表

```json
{
  "@tanstack/react-query": "^5.17.0",  // 数据获取
  "axios": "^1.6.2",                     // HTTP 请求
  "lucide-react": "^0.303.0",            // 图标
  "next": "14.1.0",
  "react": "^18.2.0",
  "tailwind-merge": "^2.2.0",
  "clsx": "^2.0.0"
}
```

## 注意事项

1. **localStorage 键名**：
   - Token: `linkchest_token`
   - User: `linkchest_user`

2. **公开路径**：
   - `/login` - 登录页
   - `/s/*` - 分享链接（无需登录查看）

3. **无需在各页面单独检查登录状态**，AuthGuard 已统一处理

4. **API 基础地址**：
   - 开发环境：`http://192.168.0.100:3001/api`
   - 生产环境：通过 `NEXT_PUBLIC_API_URL` 环境变量配置
