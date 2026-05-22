---
alwaysApply: false
description: 通用设计模式 - Repository模式、API响应格式、架构模式
---

# Common Patterns

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:

```typescript
interface UserRepository {
  getById(id: string): Promise<User | null>;
  getAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

class UserRepositoryImpl implements UserRepository {
  constructor(
    private readonly remoteDataSource: UserRemoteDataSource,
    private readonly localDataSource: UserLocalDataSource
  ) {}

  async getById(id: string): Promise<User | null> {
    const local = await this.localDataSource.getById(id);
    if (local) return local;
    const remote = await this.remoteDataSource.getById(id);
    if (remote) await this.localDataSource.save(remote);
    return remote;
  }

  async getAll(): Promise<User[]> {
    const remote = await this.remoteDataSource.getAll();
    for (const user of remote) {
      await this.localDataSource.save(user);
    }
    return remote;
  }

  async save(user: User): Promise<void> {
    await this.localDataSource.save(user);
    await this.remoteDataSource.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.remoteDataSource.delete(id);
    await this.localDataSource.delete(id);
  }
}
```

**Benefits:**
- Consistent interface for data access
- Easy to swap data sources
- Simplifies testing with mocks
- Clear separation of concerns

### API Response Format

Use a consistent envelope for all API responses:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationMetadata;
}

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ApiResponseBuilder {
  static success<T>(data: T, pagination?: PaginationMetadata): ApiResponse<T> {
    return { success: true, data, pagination };
  }

  static error(message: string): ApiResponse<never> {
    return { success: false, error: message };
  }
}
```

**Benefits:**
- Consistent client handling
- Clear success/error states
- Built-in pagination support
- Easy to extend

## Architectural Patterns

### Clean Architecture

```
┌─────────────────┐
│   Presentation  │  (UI, Components, Views)
├─────────────────┤
│     Domain      │  (Business Logic, Use Cases)
├─────────────────┤
│      Data       │  (Repositories, Data Sources)
└─────────────────┘

Dependency Rule: Inner layers cannot depend on outer layers
```

### Layered Architecture

```
┌─────────────────┐
│   Controllers   │  (HTTP handlers, route handlers)
├─────────────────┤
│     Services    │  (Business logic, orchestration)
├─────────────────┤
│  Repositories   │  (Data access abstraction)
├─────────────────┤
│   Data Access   │  (Database, external APIs)
└─────────────────┘
```

## State Management Patterns

See language-specific patterns:
- TypeScript: `typescript/patterns.md` (React Context, Zustand, Redux)

## See Also

- Code style: `CODE_STYLE.md`
- Testing: `TESTING.md`
- Performance: `PERFORMANCE.md`
