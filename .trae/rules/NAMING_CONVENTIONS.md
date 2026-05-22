---
alwaysApply: false
description: 命名约定规则 - 定义项目现有的命名/风格约定发现方法
---

# NAMING_CONVENTIONS.md — 命名约定规则

> 本文档定义 LinkChest 项目中现有的命名风格约定，帮助开发者保持代码一致性。

---

## 1. 文件命名

### 1.1 通用规则

| 类型 | 格式 | 示例 |
|------|------|------|
| **普通文件** | 小写 + 连字符 (`kebab-case`) | `user-service.ts`, `auth-middleware.ts` |
| **组件文件** | 大驼峰 (`PascalCase`) | `CollectionCard.tsx`, `ShareModal.tsx` |
| **工具函数** | 小写 + 连字符 | `utils.ts`, `string-utils.ts` |
| **测试文件** | 文件名 + `.test.ts` | `auth.test.ts`, `platforms.test.ts` |

### 1.2 按应用分类

#### API 服务 (`apps/api`)
```
src/
├── routes/           # 路由文件：kebab-case
│   ├── auth.ts
│   ├── collections.ts
│   └── share-imports.ts
├── services/         # 服务文件：kebab-case
│   ├── platforms.ts
│   ├── metadata.ts
│   └── share-sync.ts
├── middleware/       # 中间件文件：kebab-case
│   ├── auth.ts
│   └── request-tracker.ts
└── lib/              # 工具库：kebab-case 或普通名词
    ├── utils.ts
    ├── logger.ts
    └── error-codes.ts
```

#### Web 应用 (`apps/web`)
```
src/
├── app/              # Next.js 路由：kebab-case
│   ├── dashboard/
│   ├── collections/
│   └── share/[id]/
├── components/       # 组件：PascalCase
│   ├── CollectionCard.tsx
│   ├── TagSelector.tsx
│   └── Layout/       # 组件目录：PascalCase
│       └── Header.tsx
├── lib/              # 工具库：kebab-case
│   ├── api.ts
│   └── auth.ts
└── store/            # 状态管理：kebab-case
    └── useStore.ts
```

#### 移动端 (`apps/mobile`)
```
src/
├── screens/          # 页面：PascalCase + Screen
│   ├── LoginScreen.tsx
│   ├── CollectionsScreen.tsx
│   └── ShareDetailScreen.tsx
├── components/       # 组件：PascalCase
│   ├── LazyImage.tsx
│   └── StarRating.tsx
├── lib/              # 工具库：kebab-case
│   ├── api.ts
│   └── i18n.tsx
└── store/            # 状态管理：kebab-case
    ├── auth.ts
    └── theme.ts
```

---

## 2. 变量命名

### 2.1 通用规则

| 类型 | 格式 | 示例 |
|------|------|------|
| **普通变量** | 小驼峰 (`camelCase`) | `userName`, `collectionId`, `isLoading` |
| **常量** | 全大写 + 下划线 (`UPPER_SNAKE_CASE`) | `MAX_SIZE`, `DEFAULT_PAGE_SIZE`, `JWT_SECRET` |
| **私有变量** | 小驼峰 + 下划线前缀 | `_internalState`, `_cache` |
| **布尔变量** | 以 `is`, `has`, `can`, `should` 开头 | `isLoggedIn`, `hasMore`, `canEdit`, `shouldRefresh` |

### 2.2 特殊变量

| 类型 | 格式 | 示例 |
|------|------|------|
| **ID** | 后缀 `Id` | `userId`, `collectionId`, `shareId` |
| **数组** | 复数形式 | `users`, `collections`, `tags` |
| **Promise** | 后缀 `Promise` | `fetchUserPromise`, `uploadPromise` |
| **Observable** | 后缀 `$` | `count$`, `data$` |

---

## 3. 函数/方法命名

### 3.1 通用规则

| 类型 | 格式 | 示例 |
|------|------|------|
| **普通函数** | 小驼峰 | `getUser`, `createCollection`, `validateUrl` |
| **异步函数** | 前缀 `async` 或返回 Promise | `async getUser`, `fetchCollections` |
| **纯函数** | 无副作用，返回计算结果 | `formatDate`, `generateSlug` |
| **命令式函数** | 动词开头 | `saveUser`, `deleteCollection`, `sendNotification` |

### 3.2 常用动词前缀

| 前缀 | 含义 | 示例 |
|------|------|------|
| `get` | 获取数据 | `getUser`, `getCollections` |
| `fetch` | 从远程获取 | `fetchMetadata`, `fetchShare` |
| `create` | 创建资源 | `createUser`, `createCollection` |
| `update` | 更新资源 | `updateUser`, `updateCollection` |
| `delete` | 删除资源 | `deleteCollection`, `deleteShare` |
| `validate` | 验证数据 | `validateEmail`, `validateUrl` |
| `format` | 格式化数据 | `formatDate`, `formatPrice` |
| `parse` | 解析数据 | `parseUrl`, `parseJson` |
| `convert` | 转换数据 | `convertToDto`, `convertToModel` |
| `generate` | 生成数据 | `generateToken`, `generateShareUrl` |

---

## 4. 类/接口/类型命名

### 4.1 通用规则

| 类型 | 格式 | 示例 |
|------|------|------|
| **类** | 大驼峰 (`PascalCase`) | `UserService`, `MetadataFetcher` |
| **接口** | 前缀 `I` + 大驼峰 | `IUser`, `ICollection`, `IShareOptions` |
| **类型** | 大驼峰 | `UserType`, `CollectionStatus`, `PlatformType` |
| **枚举** | 大驼峰 | `Platform`, `UserStatus`, `ShareVisibility` |

### 4.2 类型命名模式

```typescript
// 接口：I + 名词
interface IUser {
  id: string;
  email: string;
  createdAt: Date;
}

// 类型：名词 + Type（可选）
type UserId = string;
type CollectionList = ICollection[];

// 枚举：名词（单数）
enum Platform {
  DOUYIN = 'douyin',
  XIAOHONGSHU = 'xiaohongshu',
  BILIBILI = 'bilibili',
}
```

---

## 5. 数据库相关命名

### 5.1 表名
- 使用 **蛇形命名** (`snake_case`)
- 采用 **复数形式**
- 示例：`users`, `collections`, `tags`, `share_items`

### 5.2 字段名
- 使用 **蛇形命名** (`snake_case`)
- 示例：`user_id`, `created_at`, `cover_image`, `deleted_at`

### 5.3 Prisma 模型
- 模型名：**大驼峰**（单数）
- 字段名：**小驼峰**
- 示例：
```prisma
model User {
  id        String   @id @default(uuid())
  email     String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 6. API 路由命名

### 6.1 路径规则
- 使用 **小写 + 连字符**
- 资源使用 **复数形式**
- 示例：`/api/users`, `/api/collections`, `/api/shares`

### 6.2 RESTful 模式

| 方法 | 路径 | 含义 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/users/:id` | 获取单个用户 |
| POST | `/api/users` | 创建用户 |
| PUT/PATCH | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

### 6.3 嵌套资源

| 方法 | 路径 | 含义 |
|------|------|------|
| GET | `/api/users/:userId/collections` | 获取用户的收藏列表 |
| POST | `/api/users/:userId/collections` | 为用户创建收藏 |

---

## 7. CSS/Tailwind 命名

### 7.1 类名规则
- 使用 **小写 + 连字符**
- 遵循 BEM 命名规范（可选）
- 示例：`collection-card`, `btn-primary`, `modal-overlay`

### 7.2 Tailwind 优先级
1. 优先使用 Tailwind 内置类
2. 自定义类使用 `c-` 前缀区分
3. 示例：
```tsx
<div className="flex items-center c-custom-card">
  {/* ... */}
</div>
```

---

## 8. 命名发现方法

### 8.1 快速检查现有约定
```bash
# 查看项目中的文件命名模式
ls apps/api/src/routes/
ls apps/web/src/components/

# 搜索变量命名模式
grep -r "const MAX_" apps/api/src/
grep -r "is[A-Z]" apps/api/src/

# 搜索函数命名模式
grep -r "function get" apps/api/src/
grep -r "async fetch" apps/api/src/
```

### 8.2 遵循原则
1. **一致性**：与同一文件/目录中的现有命名保持一致
2. **可读性**：命名应清晰表达用途，避免缩写（除非广为人知）
3. **语义化**：使用有意义的名称，避免无意义的 `data`, `info`, `result`
4. **搜索友好**：名称应易于搜索（如使用常见前缀）

---

## 9. 命名反模式

| 反模式 | 问题 | 正确做法 |
|--------|------|----------|
| `data`, `info`, `result` | 语义模糊 | 使用具体名称如 `user`, `collections`, `metadata` |
| `a`, `b`, `c` | 无法理解 | 使用有意义的名称 |
| `myVar`, `temp` | 临时命名未重构 | 使用具体名称 |
| `function1`, `function2` | 无意义编号 | 使用描述性名称 |
| 混合大小写 | 不一致 | 统一使用小驼峰或大驼峰 |

---

*最后更新：2026-05-11*
*版本：v1.0*
