---
alwaysApply: false
description: 测试规范 - 单元测试、集成测试、E2E测试编写规范与TDD工作流
---

# TESTING.md — 测试规范

> 本文档定义 LinkChest 项目中的测试编写规范和最佳实践。

---

## 1. 测试类型

### 1.1 测试层次

| 层级 | 类型 | 目的 | 示例 |
|------|------|------|------|
| **Unit** | 单元测试 | 测试单个函数/方法 | `utils.test.ts` |
| **Integration** | 集成测试 | 测试模块间交互 | `auth.test.ts` |
| **E2E** | 端到端测试 | 测试完整用户流程 | `login-flow.test.ts` |

### 1.2 测试覆盖范围

| 模块 | 单元测试 | 集成测试 | E2E 测试 |
|------|----------|----------|----------|
| API 路由 | ✅ | ✅ | ❌ |
| 服务层 | ✅ | ✅ | ❌ |
| 工具函数 | ✅ | ❌ | ❌ |
| UI 组件 | ✅ | ❌ | ✅ |
| 数据库操作 | ❌ | ✅ | ❌ |

---

## 2. 测试文件结构

### 2.1 目录结构

```
apps/api/
├── src/
│   ├── routes/
│   │   └── auth.ts
│   ├── services/
│   │   └── platforms.ts
│   └── __tests__/           # 测试目录
│       ├── auth.test.ts     # 路由测试
│       ├── platforms.test.ts # 服务测试
│       ├── utils.test.ts    # 工具函数测试
│       └── setup.ts         # 测试设置
```

### 2.2 文件命名规则

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 单元测试 | `{文件名}.test.ts` | `utils.test.ts` |
| 集成测试 | `{模块名}.test.ts` | `auth.test.ts` |
| E2E 测试 | `{场景}.e2e.ts` | `login-flow.e2e.ts` |

---

## 3. 单元测试规范

### 3.1 测试结构

```typescript
import { describe, it, expect } from '@jest/globals';
import { validateEmail, formatDate } from '../lib/utils';

describe('utils', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('2024-01-15');
    });
  });
});
```

### 3.2 测试命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 正常情况 | `should {行为} when {条件}` | `should return true for valid email` |
| 边界情况 | `should {行为} when {边界条件}` | `should return false for empty string` |
| 异常情况 | `should {行为} when {异常条件}` | `should throw error for null input` |

### 3.3 Mock 规范

```typescript
// ✅ 好：使用 jest.mock 进行模块 mock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
    },
  })),
}));

// ✅ 好：mock 返回值
const mockFetch = jest.fn().mockResolvedValue({
  json: jest.fn().mockResolvedValue({ data: 'test' }),
});
global.fetch = mockFetch;
```

---

## 4. 集成测试规范

### 4.1 测试设置

```typescript
// setup.ts
import { PrismaClient } from '@prisma/client';

beforeAll(async () => {
  // 初始化测试数据库
});

afterAll(async () => {
  // 清理测试数据库
});

beforeEach(async () => {
  // 每个测试前重置状态
});

afterEach(async () => {
  // 每个测试后清理
});
```

### 4.2 API 集成测试

```typescript
import request from 'supertest';
import app from '../index';

describe('Auth API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
  });

  it('should return error for duplicate email', async () => {
    // 先注册一个用户
    await request(app).post('/api/auth/register').send({
      email: 'duplicate@example.com',
      password: 'password123',
    });

    // 再次注册相同邮箱
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });
});
```

---

## 5. E2E 测试规范

### 5.1 测试场景

| 场景 | 描述 | 优先级 |
|------|------|--------|
| **用户登录** | 登录流程 | 高 |
| **添加收藏** | 创建收藏流程 | 高 |
| **分享收藏** | 生成分享链接 | 高 |
| **标签管理** | 创建/删除标签 | 中 |
| **列表管理** | 创建/删除列表 | 中 |

### 5.2 E2E 测试结构

```typescript
// 使用 Playwright 或类似工具
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  // 1. 导航到登录页
  await page.goto('/login');

  // 2. 输入邮箱和密码
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');

  // 3. 点击登录按钮
  await page.click('button[type="submit"]');

  // 4. 验证跳转到首页
  await expect(page).toHaveURL('/dashboard');
});
```

---

## 6. 测试驱动开发（TDD）

### 6.1 TDD 工作流

**MANDATORY 流程：**

```
1. 编写测试（RED）→ 2. 运行测试（失败）→ 3. 实现代码（GREEN）→ 4. 运行测试（通过）→ 5. 重构（IMPROVE）→ 6. 验证覆盖率（80%+）
```

### 6.2 AAA 测试模式

使用 Arrange-Act-Assert 结构：

```typescript
test('calculates similarity correctly', () => {
  // Arrange - 准备测试数据
  const vector1 = [1, 0, 0];
  const vector2 = [0, 1, 0];

  // Act - 执行被测代码
  const similarity = calculateCosineSimilarity(vector1, vector2);

  // Assert - 验证结果
  expect(similarity).toBe(0);
});
```

### 6.3 测试命名规范

使用描述性名称说明测试行为：

```typescript
test('returns empty array when no markets match query', () => {});
test('throws error when API key is missing', () => {});
test('falls back to substring search when Redis is unavailable', () => {});
```

---

## 7. 测试最佳实践

### 7.1 测试原则

| 原则 | 说明 |
|------|------|
| **隔离性** | 测试之间相互独立，不共享状态 |
| **可重复性** | 相同输入始终产生相同结果 |
| **快速性** | 测试应快速运行 |
| **可读性** | 测试代码易于理解 |

### 7.2 测试覆盖率目标

| 模块 | 覆盖率要求 |
|------|------------|
| 工具函数 | ≥ 90% |
| 服务层 | ≥ 80% |
| 路由层 | ≥ 70% |
| UI 组件 | ≥ 60% |

### 7.3 避免的反模式

| 反模式 | 问题 | 正确做法 |
|--------|------|----------|
| **测试实现细节** | 测试过于依赖实现，重构时容易失败 | 测试行为而非实现 |
| **测试数据硬编码** | 测试数据分散在各处 | 使用工厂函数生成测试数据 |
| **长时间运行的测试** | 影响开发效率 | 优化测试或使用并行执行 |
| **缺少断言** | 测试通过但未验证结果 | 每个测试至少一个断言 |

---

## 8. 测试命令

### 8.1 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --testPathPattern=auth.test.ts

# 运行特定测试用例
npm test -- --testNamePattern="should register"

# 监听模式（开发时使用）
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

### 8.2 测试配置

```json
// jest.config.js
{
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/**/*.test.ts"],
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "setupFilesAfterEnv": ["<rootDir>/src/__tests__/setup.ts"],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

---

## 9. 测试审查检查清单

| 检查项 | 说明 |
|--------|------|
| **测试覆盖** | 是否覆盖了主要场景 |
| **测试隔离** | 测试之间是否相互独立 |
| **断言数量** | 每个测试至少有一个断言 |
| **mock 合理性** | mock 是否合理，没有过度 mock |
| **测试命名** | 测试名称是否清晰描述预期行为 |
| **测试速度** | 测试是否快速运行 |
| **错误信息** | 失败时是否有清晰的错误信息 |

---

*最后更新：2026-05-11*
*版本：v1.0*
