---
alwaysApply: false
description: 代码风格规范 - TypeScript/React 代码编写与命名规范
---

# CODE_STYLE.md — 代码风格规范

> 本文档定义 LinkChest 项目中的代码风格与命名规范，确保代码可读性和一致性。

---

## 1. TypeScript 基础规范

### 1.1 文件结构

```typescript
// 1. 外部依赖导入（按字母顺序）
import express from 'express';
import { PrismaClient } from '@prisma/client';

// 2. 内部模块导入（按字母顺序）
import { UserService } from '../services/user-service';
import { validateEmail } from '../lib/utils';

// 3. 类型定义
interface ICreateUserRequest {
  email: string;
  password: string;
}

// 4. 常量定义
const MAX_RETRY = 3;

// 5. 主要代码
export class AuthController {
  // ...
}
```

### 1.2 导入顺序
1. 外部依赖（npm packages）
2. 内部模块（项目内文件）
3. 类型定义
4. 常量
5. 主要代码

### 1.3 变量声明

| 类型 | 关键字 | 示例 |
|------|--------|------|
| 常量 | `const` | `const MAX_SIZE = 1024;` |
| 变量 | `let` | `let count = 0;` |
| 避免 | `var` | ❌ 不使用 |

---

## 2. 命名规范

### 2.1 文件命名

| 类型 | 格式 | 示例 |
|------|------|------|
| **普通文件** | 小写 + 连字符 (`kebab-case`) | `user-service.ts`, `auth-middleware.ts` |
| **组件文件** | 大驼峰 (`PascalCase`) | `CollectionCard.tsx`, `ShareModal.tsx` |
| **工具函数** | 小写 + 连字符 | `utils.ts`, `string-utils.ts` |
| **测试文件** | 文件名 + `.test.ts` | `auth.test.ts`, `platforms.test.ts` |

按应用分类：

```
apps/api/src/
├── routes/           # kebab-case: auth.ts, share-imports.ts
├── services/         # kebab-case: platforms.ts, share-sync.ts
├── middleware/        # kebab-case: auth.ts, request-tracker.ts
└── lib/              # kebab-case: utils.ts, error-codes.ts

apps/web/src/
├── app/              # Next.js 路由: dashboard/, share/[id]/
├── components/       # PascalCase: CollectionCard.tsx, Layout/Header.tsx
├── lib/              # kebab-case: api.ts, auth.ts
└── store/            # kebab-case: useStore.ts

apps/mobile/src/
├── screens/          # PascalCase + Screen: LoginScreen.tsx
├── components/       # PascalCase: LazyImage.tsx, StarRating.tsx
├── lib/              # kebab-case: api.ts, i18n.tsx
└── store/            # kebab-case: auth.ts, theme.ts
```

### 2.2 变量命名

| 类型 | 格式 | 示例 |
|------|------|------|
| **普通变量** | 小驼峰 (`camelCase`) | `userName`, `collectionId`, `isLoading` |
| **常量** | 全大写 + 下划线 (`UPPER_SNAKE_CASE`) | `MAX_SIZE`, `DEFAULT_PAGE_SIZE`, `JWT_SECRET` |
| **私有变量** | 小驼峰 + 下划线前缀 | `_internalState`, `_cache` |
| **布尔变量** | 以 `is`, `has`, `can`, `should` 开头 | `isLoggedIn`, `hasMore`, `canEdit` |
| **ID** | 后缀 `Id` | `userId`, `collectionId`, `shareId` |
| **数组** | 复数形式 | `users`, `collections`, `tags` |

### 2.3 函数命名

| 类型 | 格式 | 示例 |
|------|------|------|
| **普通函数** | 小驼峰 | `getUser`, `createCollection`, `validateUrl` |
| **命令式函数** | 动词开头 | `saveUser`, `deleteCollection`, `sendNotification` |

常用动词前缀：

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

### 2.4 类/接口/类型命名

| 类型 | 格式 | 示例 |
|------|------|------|
| **类** | 大驼峰 (`PascalCase`) | `UserService`, `MetadataFetcher` |
| **接口** | 前缀 `I` + 大驼峰 | `IUser`, `ICollection`, `IShareOptions` |
| **类型** | 大驼峰 | `UserType`, `CollectionStatus`, `PlatformType` |
| **枚举** | 大驼峰 | `Platform`, `UserStatus`, `ShareVisibility` |

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

### 2.5 数据库命名

| 对象 | 格式 | 示例 |
|------|------|------|
| **表名** | `snake_case` 复数 | `users`, `collections`, `share_items` |
| **字段名** | `snake_case` | `user_id`, `created_at`, `cover_image` |
| **Prisma 模型** | 大驼峰（单数） | `User`, `Collection` |
| **Prisma 字段** | 小驼峰 | `createdAt`, `coverImage` |

### 2.6 API 路由命名

- 路径使用 **小写 + 连字符**，资源使用 **复数形式**
- 示例：`/api/users`, `/api/collections`, `/api/shares`

| 方法 | 路径 | 含义 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| GET | `/api/users/:id` | 获取单个用户 |
| POST | `/api/users` | 创建用户 |
| PUT/PATCH | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

嵌套资源：`GET /api/users/:userId/collections`

### 2.7 CSS/Tailwind 命名

- 类名使用 **小写 + 连字符**（可选 BEM）
- 优先使用 Tailwind 内置类，自定义类使用 `c-` 前缀

```tsx
<div className="flex items-center c-custom-card">
  {/* ... */}
</div>
```

### 2.8 命名反模式

| 反模式 | 问题 | 正确做法 |
|--------|------|----------|
| `data`, `info`, `result` | 语义模糊 | 使用具体名称如 `user`, `collections`, `metadata` |
| `a`, `b`, `c` | 无法理解 | 使用有意义的名称 |
| `myVar`, `temp` | 临时命名未重构 | 使用具体名称 |
| `function1`, `function2` | 无意义编号 | 使用描述性名称 |
| 混合大小写 | 不一致 | 统一使用小驼峰或大驼峰 |

---

## 3. 函数规范

### 3.1 函数签名

```typescript
// ✅ 好：参数有类型，返回值有类型
async function getUserById(userId: string): Promise<IUser | null> {
  // ...
}

// ✅ 好：箭头函数同样
const formatDate = (date: Date): string => {
  return date.toISOString();
};

// ❌ 不好：缺少类型
function getUser(id) {
  // ...
}
```

### 3.2 函数长度
- **单行函数**：简单逻辑可写在一行
- **普通函数**：不超过 50 行
- **复杂函数**：超过 50 行考虑拆分

### 3.3 参数数量
- 建议不超过 3-4 个参数
- 超过时使用对象参数

```typescript
// ✅ 好：使用对象参数
interface CreateCollectionOptions {
  url: string;
  title?: string;
  tags?: string[];
}

async function createCollection(options: CreateCollectionOptions): Promise<ICollection> {
  const { url, title, tags } = options;
  // ...
}
```

### 3.4 错误处理

```typescript
// ✅ 好：使用 try-catch
async function fetchMetadata(url: string): Promise<IMetadata | null> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch metadata', { url, error });
    return null;
  }
}

// ✅ 好：抛出有意义的错误
function validateUrl(url: string): void {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format');
  }
}
```

---

## 4. 类规范

### 4.1 类结构

```typescript
class UserService {
  // 1. 静态属性
  private static instance: UserService;

  // 2. 实例属性
  private prisma: PrismaClient;
  private cache: Map<string, IUser>;

  // 3. 构造函数
  private constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map();
  }

  // 4. 静态方法
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // 5. 公共方法
  public async getUserById(id: string): Promise<IUser | null> {
    // ...
  }

  // 6. 私有方法
  private async fetchFromDb(id: string): Promise<IUser | null> {
    // ...
  }
}
```

### 4.2 访问修饰符
- `public`：对外暴露的方法/属性
- `private`：仅类内部使用
- `protected`：子类可访问（如需要）

---

## 5. 条件语句

### 5.1 if-else

```typescript
// ✅ 好：条件清晰，提前返回
function processCollection(collection: ICollection | null): void {
  if (!collection) {
    return; // 提前返回
  }

  if (collection.deletedAt) {
    handleDeleted(collection);
    return;
  }

  // 正常处理
  processValid(collection);
}

// ✅ 好：使用三元运算符处理简单分支
const status = isActive ? 'active' : 'inactive';

// ❌ 不好：嵌套过深
if (a) {
  if (b) {
    if (c) {
      // ...
    }
  }
}
```

### 5.2 switch

```typescript
// ✅ 好：每个 case 有 break，有 default
switch (platform) {
  case Platform.DOUYIN:
    return handleDouyin(url);
  case Platform.XIAOHONGSHU:
    return handleXiaohongshu(url);
  case Platform.BILIBILI:
    return handleBilibili(url);
  default:
    return handleUnknown(url);
}
```

---

## 6. 循环语句

### 6.1 数组遍历

```typescript
const items = [1, 2, 3];

// ✅ 好：使用 forEach 进行简单遍历
items.forEach(item => processItem(item));

// ✅ 好：使用 map 转换
const doubled = items.map(item => item * 2);

// ✅ 好：使用 filter 过滤
const even = items.filter(item => item % 2 === 0);

// ✅ 好：使用 reduce 聚合
const sum = items.reduce((acc, item) => acc + item, 0);

// ✅ 好：使用 for...of 进行复杂遍历
for (const item of items) {
  if (shouldSkip(item)) continue;
  processItem(item);
}
```

### 6.2 异步循环

```typescript
// ✅ 好：并行执行
const results = await Promise.all(items.map(async item => fetchData(item)));

// ✅ 好：串行执行
for (const item of items) {
  await processItem(item);
}

// ✅ 好：限制并发数
import pLimit from 'p-limit';
const limit = pLimit(5);
const results = await Promise.all(items.map(item => limit(() => fetchData(item))));
```

---

## 7. 箭头函数 vs 普通函数

| 场景 | 推荐方式 | 示例 |
|------|----------|------|
| **回调函数** | 箭头函数 | `items.map(item => item * 2)` |
| **方法定义** | 普通函数 | `class { method() {} }` |
| **需要 this** | 普通函数 | 类方法 |
| **高阶函数** | 箭头函数 | `const compose = (f, g) => x => f(g(x))` |

---

## 8. 类型与接口规范

### 8.1 Interface vs Type Alias

| 使用场景 | 推荐方式 | 示例 |
|----------|----------|------|
| 对象形状可扩展 | `interface` | `interface User { id: string }` |
| 联合类型 | `type` | `type Status = 'active' \| 'inactive'` |
| 交叉类型 | `type` | `type UserWithRole = User & { role: string }` |
| 元组 | `type` | `type Point = [number, number]` |

### 8.2 避免 any

```typescript
// ❌ 不好：any 移除类型安全
function getErrorMessage(error: any) {
  return error.message;
}

// ✅ 好：unknown 强制安全窄化
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error';
}
```

### 8.3 使用 Zod 进行输入验证

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
});

type UserInput = z.infer<typeof userSchema>;
const validated = userSchema.parse(input);
```

---

## 9. 不可变性规范

```typescript
interface User {
  id: string;
  name: string;
}

// ❌ 不好：直接修改
function updateUser(user: User, name: string): User {
  user.name = name; // MUTATION!
  return user;
}

// ✅ 好：使用展开运算符
function updateUser(user: Readonly<User>, name: string): User {
  return { ...user, name };
}
```

---

## 10. 代码注释

### 10.1 注释原则
- **少而精**：代码应该自解释
- **注释"为什么"**：而非"做什么"
- **保持更新**：代码变更时同步更新注释

### 10.2 注释类型

```typescript
/**
 * 获取用户信息
 * @param userId - 用户ID
 * @returns 用户对象或 null
 */
async function getUserById(userId: string): Promise<IUser | null> {
  // ...
}

// 单行注释：解释复杂逻辑
if (condition) {
  // 处理特殊情况：当用户未完成注册时跳过验证
  return null;
}

/*
 * 多行注释：解释复杂算法或业务逻辑
 * 这里使用二分查找优化性能，因为数据量可能很大
 */
function binarySearch(items: IItem[], target: string): number {
  // ...
}
```

---

## 11. React 组件规范

### 11.1 组件结构

```tsx
// ✅ 好：函数组件 + TypeScript
interface CollectionCardProps {
  collection: ICollection;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CollectionCard({ collection, onEdit, onDelete }: CollectionCardProps) {
  // 1. 状态
  const [isHovered, setIsHovered] = useState(false);

  // 2. 副作用
  useEffect(() => {
    // ...
  }, [collection.id]);

  // 3. 事件处理
  const handleClick = () => {
    onEdit(collection.id);
  };

  // 4. 渲染
  return (
    <div 
      className={`card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3>{collection.title}</h3>
      <p>{collection.url}</p>
      <button onClick={handleClick}>编辑</button>
    </div>
  );
}
```

### 11.2 Hooks 使用规则
- **只在组件顶层调用**：不要在循环、条件或嵌套函数中调用
- **自定义 Hook 以 use 开头**：`useLocalStorage`, `useDebounce`
- **依赖数组要完整**：确保所有依赖都在数组中

---

## 12. 错误处理规范

### 12.1 错误类型

```typescript
// ✅ 好：自定义错误类
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// 使用
throw new ValidationError('Email is required', 'email');
throw new NotFoundError('User not found');
```

### 12.2 错误响应（API）

```typescript
// ✅ 好：统一错误响应格式
function errorResponse(res, statusCode, errorCode, details?) {
  return res.status(statusCode).json({
    error: errorCode,
    details,
  });
}

// 使用
if (!user) {
  return errorResponse(res, 404, AuthErrorCodes.USER_NOT_FOUND);
}
```

---

## 13. 性能优化

### 13.1 避免重复计算

```typescript
// ✅ 好：缓存计算结果
function processItems(items: IItem[]) {
  const processed = items.map(item => {
    const hash = computeHash(item); // 只计算一次
    return { ...item, hash };
  });
  return processed;
}
```

### 13.2 使用高效的数据结构

```typescript
// ✅ 好：使用 Map 替代对象进行快速查找
const userMap = new Map<string, IUser>();
users.forEach(user => userMap.set(user.id, user));

// O(1) 查找
const user = userMap.get(userId);
```

### 13.3 懒加载

```typescript
// ✅ 好：React 组件懒加载
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// 使用
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

---

## 14. 代码组织

### 14.1 文件长度
- 单个文件建议不超过 500 行
- 超过时考虑拆分

### 14.2 模块职责
- 每个文件/模块只做一件事
- 避免"上帝对象"或"万能工具类"

### 14.3 导出规则
- 使用 `export` 按需导出
- 避免 `export * from`（除非有明确理由）
- 导出时保持顺序（常量、类型、函数、类）

---

## 15. 代码审查检查清单

| 检查项 | 说明 |
|--------|------|
| **类型安全** | 所有变量、参数、返回值都有类型 |
| **错误处理** | 所有异步操作都有 try-catch |
| **命名规范** | 变量、函数、类命名清晰有意义 |
| **代码长度** | 函数不超过 50 行，文件不超过 500 行 |
| **注释质量** | 注释解释"为什么"而非"做什么" |
| **重复代码** | 没有明显的重复逻辑 |
| **性能考虑** | 没有明显的性能问题 |
| **安全考虑** | 没有 SQL 注入、XSS 等安全隐患 |

---

*最后更新：2026-05-22*
*版本：v2.0 — 合并 NAMING_CONVENTIONS.md，新增命名规范章节*
