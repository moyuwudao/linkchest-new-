---
alwaysApply: false
description: 通用安全指南 - 安全检查清单、秘密管理、输入验证
---

# Security Guidelines

## Mandatory Security Checks

Before ANY commit:

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML output)
- [ ] CSRF protection enabled (where applicable)
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data
- [ ] No sensitive data in logs

## Secret Management

- **NEVER** hardcode secrets in source code
- **ALWAYS** use environment variables or a secret manager
- **Validate** that required secrets are present at startup
- **Rotate** any secrets that may have been exposed

### Secure Storage Patterns

```
✅ Environment variables (.env files in .gitignore)
✅ Platform secure storage (Keychain, Keystore)
✅ Secret management services (AWS Secrets Manager, etc.)
❌ Hardcoded strings in code
❌ Committed .env files
❌ Plaintext storage
```

## Input Validation

- Validate ALL user input before processing
- Sanitize output before rendering
- Use allowlists over blocklists
- Validate types, ranges, and formats

### Common Attack Vectors

| Attack | Prevention |
|--------|------------|
| SQL Injection | Parameterized queries, ORM |
| XSS | Output encoding, CSP headers |
| CSRF | CSRF tokens, SameSite cookies |
| Path Traversal | Path validation, sandboxing |
| Command Injection | Avoid shell execution, sanitize |

## Network Security

- Enforce HTTPS for all external communication
- Validate SSL certificates
- Set request timeouts
- Implement retry with backoff
- Consider certificate pinning for high-security apps

## Authentication & Authorization

- Use established auth libraries (don't roll your own)
- Implement proper session management
- Enforce strong password policies
- Use MFA where possible
- Implement account lockout after failed attempts
- Validate permissions on every request

## Data Protection

- Encrypt sensitive data at rest
- Encrypt sensitive data in transit (TLS)
- Implement proper key management
- Clear sensitive data on logout
- Implement data retention policies

## Security Response Protocol

**If security issue found:**

1. **STOP** immediately
2. **Use security-reviewer agent**
3. **Fix CRITICAL issues** before continuing
4. **Rotate** any exposed secrets
5. **Review** entire codebase for similar issues
6. **Document** the issue and fix

## Security Testing

- Run security scans in CI/CD
- Use static analysis tools (SAST)
- Use dynamic analysis tools (DAST)
- Perform regular dependency audits
- Conduct penetration testing for critical features

## See Also

- Code review standards: `CODE_REVIEW.md`
- Security reviewer agent: `AGENTS.md`
- Security red lines: `RED_LINES.md`
