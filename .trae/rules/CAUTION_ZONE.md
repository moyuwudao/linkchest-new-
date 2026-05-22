---
alwaysApply: true
description: 警告区域规则 - 应急响应与Web安全（黄色区域）
---

# CAUTION_ZONE.md — 警告区域（黄色区域）

> 本文档定义安全事件的应急响应流程和Web安全配置要求。
> **本规则 alwaysApply: true，任何Agent在任何场景下都必须遵守。**

---

## 1. 应急响应

### 1.1 发现安全问题时

1. **立即停止**：停止正在进行的开发工作
2. **评估风险**：判断问题严重程度
3. **隔离影响**：生产环境立即采取隔离措施
4. **通知相关人员**：告知项目负责人
5. **修复验证**：修复后进行充分测试
6. **记录总结**：记录问题和解决方案

### 1.2 安全问题分类

| 等级 | 描述 | 响应时间 |
|------|------|----------|
| **Critical** | 可能导致数据泄露或系统崩溃 | 立即 |
| **High** | 可能导致未授权访问 | 24小时内 |
| **Medium** | 可能被利用的漏洞 | 1周内 |
| **Low** | 安全隐患但风险较低 | 下次发布 |

---

## 2. Web 安全配置

### 2.1 Content Security Policy (CSP)

必须配置生产环境 CSP：

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.example.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

### 2.2 HTTP 安全头

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 2.3 XSS 防护

| 禁止行为 | 正确做法 |
|----------|----------|
| 使用 `innerHTML` / `dangerouslySetInnerHTML` | 使用 React 自动转义或白名单 sanitizer |
| 直接拼接用户输入到 HTML | 使用模板引擎或安全的 DOM API |
| 信任 URL 参数 | 验证和转义所有输入 |

### 2.4 第三方脚本安全

- 异步加载第三方脚本
- 使用 SRI（Subresource Integrity）验证 CDN 资源
- 定期审计第三方依赖
- 关键依赖优先自托管

---

## 3. 安全响应协议

### 3.1 发现安全问题时的完整流程

1. **立即停止**：停止正在进行的开发工作
2. **使用工具**：调用 **security-reviewer** agent 进行详细分析
3. **评估风险**：判断问题严重程度
4. **隔离影响**：生产环境立即采取隔离措施
5. **通知相关人员**：告知项目负责人
6. **修复验证**：修复后进行充分测试
7. **记录总结**：记录问题和解决方案
8. **轮换密钥**：如果涉及密钥泄露，立即轮换

### 3.2 提交前安全检查清单

| 检查项 | 说明 |
|--------|------|
| ✅ 无硬编码密钥 | 所有敏感配置在 .env 中 |
| ✅ 所有用户输入已验证 | 使用 Zod 或 express-validator |
| ✅ SQL 注入防护 | 使用 Prisma 参数化查询 |
| ✅ XSS 防护 | React 自动转义或 sanitizer |
| ✅ CSRF 防护 | 状态变更接口已防护 |
| ✅ 速率限制 | 所有接口有限制 |
| ✅ 错误信息不泄露敏感数据 | 使用统一错误响应格式 |

---

## 4. 责任声明

- 遵守本规则是每个开发者的责任
- 违反规则可能导致安全事故和数据损失
- 对违反规则造成的后果需承担相应责任

---

*最后更新：2026-05-20*
*版本：v1.0 — 从 RED_LINES.md 拆分独立*
