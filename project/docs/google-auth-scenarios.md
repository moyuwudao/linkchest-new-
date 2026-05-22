# Google 登录全场景分析与应对方案

> 文档版本：v1.0  
> 适用范围：Web / Mobile / API 全端  
> 最后更新：2026-04-27

---

## 一、账号创建与登录入口场景

### 场景 1：先用 Gmail 邮箱注册，再用同邮箱 Google 登录

**用户路径**：注册邮箱账户 `user@gmail.com` → 后续点击 Google 登录按钮

**当前后端逻辑**（`/auth/google`）：
1. 通过 `googleId` 查找 → 未找到
2. 通过 `email` 查找 → **找到已有用户**
3. 执行 `update` 关联 `googleId`，更新 `lastLoginAt`
4. **注意**：`authSource` 保持原值（`email`），不会变成 `google`

**结果**：
- 用户成功登录，同一个账户同时支持"邮箱+密码"和"Google 一键登录"
- 用户数据完全保留（收藏、标签、分组等）
- 用户密码仍然有效

**风险与建议**：
| 风险点 | 现状 | 建议 |
|--------|------|------|
| 邮箱修改权限 | 因 `authSource !== 'google'` 且 `googleId` 已存在，PATCH `/profile` 拦截器 `currentUser.authSource === 'google' \|\| currentUser.googleId` 会触发，禁止修改邮箱 | ✅ 已修复，行为正确 |
| 用户感知 | 用户可能困惑为何邮箱被锁定 | 在账户页明确提示"该邮箱已关联 Google 账户，不可修改" |
| 解绑 Google | 目前无解除关联功能 | 如需支持，需新增 `/auth/unlink-google` 接口 |

---

### 场景 2：先用 Google 登录（未设密码），再用同邮箱+密码登录

**用户路径**：首次用 Google 登录创建账户 `user@gmail.com`（`authSource='google'`，`passwordHash=null`）→ 退出后尝试用邮箱+密码登录

**当前后端逻辑**（`/auth/login-email`）：
1. 通过 `email` 查找用户 → 找到
2. 检查 `passwordHash` → **为 null**
3. 返回 `ERR_ACCOUNT_NOT_SET_PASSWORD`（401）

**结果**：
- 登录失败，提示"该账号未设置密码，请使用验证码登录或设置密码"
- 用户必须：① 再次使用 Google 登录；或 ② 先设置密码后再用邮箱登录

**风险与建议**：
| 风险点 | 现状 | 建议 |
|--------|------|------|
| 首次登录引导 | Google 登录后如果 `!hasPassword`，会弹窗要求设置密码 | ✅ 已在 Web/Mobile 实现 |
| 用户跳过设密 | 用户可关闭弹窗跳过，导致后续无法邮箱登录 | 每次 Google 登录后若仍未设密码，继续弹窗提示 |
| 密码登录错误提示 | 提示"未设置密码"明确 | ✅ 用户明确知道需先设密码 |
| 验证码登录 | 目前无"验证码直接登录"功能 | 如需支持，需新增免密登录流程 |

---

### 场景 3：已有 Gmail 邮箱账户，试图注册同名邮箱

**用户路径**：已有账户 `user@gmail.com` → 在注册页面再次输入该邮箱

**当前后端逻辑**（`/auth/register-email`）：
1. 验证验证码通过
2. 检查 `email` 是否已存在 → **存在**
3. 返回 `ERR_EMAIL_ALREADY_REGISTERED`（400）

**结果**：
- 注册失败，提示"该邮箱已被注册"
- 无论该邮箱是 Google 创建还是邮箱注册创建，行为一致

**风险与建议**：
| 风险点 | 现状 | 建议 |
|--------|------|------|
| 提示信息 | 仅提示"已被注册"，不区分是否已有密码 | 可优化提示："该邮箱已注册，请直接登录"或"如忘记密码，请使用找回密码功能" |
| 重复注册尝试 | 用户可能多次尝试 | ✅ 60秒验证码频率限制已防止刷接口 |

---

### 场景 4：已有 Google 账户，试图注册同名邮箱

**用户路径**：用户 A 用 Google 登录创建了 `user@gmail.com`（`authSource='google'`）→ 用户 B（或同一用户）在注册页输入该邮箱

**当前后端逻辑**：
与场景 3 完全相同。`/auth/register-email` 仅检查 `email` 唯一性，不关心 `authSource` 或 `googleId`。

**结果**：
- 返回 `ERR_EMAIL_ALREADY_REGISTERED`

**风险与建议**：
| 风险点 | 现状 | 建议 |
|--------|------|------|
| 账户接管风险 | 低。即使知道邮箱，也无法注册同名账户覆盖 | ✅ 唯一索引保障 |
| 用户混淆 | 用户忘记是否用 Google 注册过 | 登录页可提示"如果曾用 Google 登录过，请直接使用 Google 按钮登录" |

---

### 场景 5：正常邮箱注册（无 Google 关联）

**用户路径**：输入邮箱 → 获取验证码 → 设置密码 → 注册成功

**当前后端逻辑**：
1. 验证码校验通过
2. `email` 唯一性检查通过
3. 创建用户，`authSource` 默认为 `"email"`
4. 创建默认分组和标签

**结果**：
- 标准注册流程，无任何 Google 相关影响

---

## 二、账号管理场景

### 场景 A：修改账户信息（用户名 / 昵称 / 头像）

**当前后端逻辑**（`/auth/profile` PATCH）：
- `username`：检查违禁词 + 唯一性（排除自己）
- `nickname`：长度限制 1-20
- `avatar`：直接更新
- **不受 `authSource` 或 `googleId` 影响**

**各身份类型的表现**：

| 用户类型 | 修改用户名 | 修改昵称 | 修改头像 |
|----------|-----------|----------|----------|
| 纯邮箱注册 | ✅ 正常 | ✅ 正常 | ✅ 正常 |
| Google 创建（未关联邮箱） | ✅ 正常 | ✅ 正常 | ✅ 正常 |
| 邮箱注册后关联 Google | ✅ 正常 | ✅ 正常 | ✅ 正常 |

**已知问题**：
- Mobile 端 `AccountSettingsScreen.tsx` 中 `handleSaveUsername` 同时设置了 `username` 和 `nickname` 为相同值：
  ```typescript
  profileMutation.mutate({ username: usernameValue.trim(), nickname: usernameValue.trim() })
  ```
  这会导致 Google 用户的 `nickname`（原显示名）被覆盖为自定义用户名。
  **建议**：如果用户已有 `nickname` 且与 `username` 不同，保留 `nickname` 不变。

---

### 场景 B：更换绑定邮箱

**当前后端逻辑**：
1. 若 `authSource === 'google' || googleId` → 返回 `ERR_GOOGLE_EMAIL_CANNOT_CHANGE`（403）
2. 否则检查新邮箱唯一性 → 若存在返回 `ERR_EMAIL_ALREADY_REGISTERED`
3. 否则更新 `email`

**各身份类型的表现**：

| 用户类型 | 能否修改邮箱 | 行为 |
|----------|-------------|------|
| 纯邮箱注册 | ✅ 可以 | 需验证新邮箱唯一性 |
| Google 创建（`authSource='google'`） | ❌ 禁止 | 返回 `ERR_GOOGLE_EMAIL_CANNOT_CHANGE` |
| 邮箱注册后关联 Google（`authSource='email'` 但 `googleId` 有值） | ❌ 禁止 | ✅ 已修复，现正确拦截 |

**已修复的 Bug**：
- 之前仅判断 `authSource === 'google'`，导致"先邮箱注册后关联 Google"的用户可以修改邮箱，进而触发邮箱唯一性检查提示 `ERR_EMAIL_ALREADY_REGISTERED`。
- 修复：判断条件改为 `authSource === 'google' || googleId`，覆盖所有已关联 Google 的账户。

---

### 场景 C：密码相关操作

#### C1. 设置密码（首次）

**适用对象**：Google 登录用户且 `passwordHash` 为 null

**当前逻辑**（`/auth/set-password`）：
- 如果 `passwordHash` 已存在 → 返回错误（复用了 `PASSWORD_INCORRECT`）
- 否则加密并存储

**前端行为**：
- Web：Google 登录后若 `!hasPassword`，弹出 `PasswordModal`（带 amber 警告条提示"建议不要与 Google 密码一致"）
- Mobile：Google 登录后若 `!hasPassword`，弹出 Set Password Modal（带警告文本）
- 设置成功后均调用 `/auth/me` 刷新用户缓存（包括 `hasPassword` 状态）✅

#### C2. 修改密码

**适用对象**：已有 `passwordHash` 的所有用户

**当前逻辑**（`/auth/change-password`）：
- 验证 `oldPassword`
- 更新为 `newPassword`

**注意**：Google 用户设置密码后，修改密码流程与纯邮箱用户完全一致。

#### C3. 找回密码

**当前状态**：
- Mobile `LoginScreen.tsx` 中调用了 `/auth/reset-password`，但**后端该接口不存在**（404）
- Web 端未见找回密码完整实现

**风险**：找回密码功能不完整，Google 用户若未设置密码且无法使用 Google 登录（如被停用），将无法恢复账户。

---

### 场景 D：删除账户

**当前逻辑**（`/auth/account` DELETE）：
- 事务删除：collections → tags → lists → shares → user
- 不区分 `authSource`，所有用户均可删除

**风险**：
- Google 用户删除账户后，若再次使用同一 Google 账户登录，会创建全新账户（原数据已物理删除）
- 这是符合预期的行为，但需前端明确警告"删除后数据不可恢复"

---

## 三、场景矩阵总览

| 场景 | 纯邮箱用户 | Google 创建用户 | 邮箱+Google 关联用户 |
|------|-----------|----------------|---------------------|
| 邮箱登录 | ✅ 正常 | ❌ 需先设密码 | ✅ 正常 |
| Google 登录 | ❌ 无关联 | ✅ 正常 | ✅ 正常 |
| 注册同名邮箱 | ❌ 已注册 | ❌ 已注册 | ❌ 已注册 |
| 修改用户名 | ✅ | ✅ | ✅ |
| 修改邮箱 | ✅ | ❌ 禁止 | ❌ 禁止 |
| 设置密码 | 不适用 | ✅ | 不适用（已有） |
| 修改密码 | ✅ | ✅（设后） | ✅ |
| 找回密码 | ⚠️ 接口缺失 | ⚠️ 接口缺失 | ⚠️ 接口缺失 |
| 删除账户 | ✅ | ✅ | ✅ |

---

## 四、待修复与待优化清单

### 🔴 高优先级（功能缺陷）

1. **找回密码接口缺失**
   - 文件：`apps/api/src/routes/auth.ts`
   - 问题：`/auth/reset-password` 未实现，但 Mobile 端已调用
   - 建议：实现 `POST /auth/reset-password`（验证码校验 + 新密码设置）

2. **Google 用户每次登录都弹窗设密码（若跳过）**
   - 文件：`apps/web/src/app/login/page.tsx`、`apps/mobile/src/screens/LoginScreen.tsx`
   - 问题：用户关闭弹窗后，下次 Google 登录仍会弹出
   - 建议：增加"稍后再说"选项，或在账户设置页增加醒目的"设置密码"提示

### 🟡 中优先级（体验优化）

3. **Mobile 设置用户名覆盖 nickname**
   - 文件：`apps/mobile/src/screens/AccountSettingsScreen.tsx:95`
   - 问题：`profileMutation.mutate({ username, nickname })` 同时覆盖
   - 建议：仅更新 `username`，保留 `nickname` 不变；或提供单独的昵称编辑入口

4. **设置密码错误码复用**
   - 文件：`apps/api/src/routes/auth.ts:494`
   - 问题：`passwordHash` 已存在时返回 `PASSWORD_INCORRECT`，语义不准确
   - 建议：新增错误码 `PASSWORD_ALREADY_SET`

5. **注册失败提示优化**
   - 文件：`apps/api/src/routes/auth.ts:312`
   - 问题：统一返回 `EMAIL_ALREADY_REGISTERED`，未区分是否可登录
   - 建议：前端根据该错误码提示"该邮箱已注册，请直接登录"

### 🟢 低优先级（长期规划）

6. **Google 账户解绑功能**
   - 需求：允许用户解除 Google 关联（仅保留邮箱+密码登录）
   - 影响：需评估安全性和用户意图

7. **多 OAuth 提供商扩展**
   - 当前仅支持 Google，后续若增加 GitHub/Apple 等，需重新设计关联逻辑

---

## 五、核心判断逻辑速查

### 后端判断是否为"Google 用户"
```typescript
// 禁止修改邮箱的判断条件（已修复）
if (email !== undefined && (currentUser.authSource === 'google' || currentUser.googleId)) {
  return errorResponse(res, 403, AuthErrorCodes.GOOGLE_EMAIL_CANNOT_CHANGE)
}
```

### 前端判断邮箱是否锁定
```typescript
// Web
(user?.authSource === 'google' || user?.googleId) ? 锁定 : 可编辑

// Mobile
(user?.authSource === 'google' || user?.googleId) ? 锁定 : 可编辑
```

### 用户名显示优先级
```typescript
username || nickname || "未设置"
```

---

*文档结束*
