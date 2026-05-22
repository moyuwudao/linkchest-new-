/**
 * 邮箱认证 Provider
 * 邮箱+密码注册/登录，验证码发送
 */

import type { AuthProvider, OAuthCredential, AuthResult } from './types'
import logger from '../../lib/logger'

export class EmailAuthProvider implements AuthProvider {
  readonly name = 'email' as const

  isConfigured(): boolean {
    // 邮箱认证始终可用
    return true
  }

  async verifyCredential(credential: OAuthCredential): Promise<AuthResult> {
    // 邮箱认证不走标准 OAuth 流程
    // 实际逻辑在 auth.ts 路由中处理（验证码验证 + 密码验证）
    logger.warn('EmailAuthProvider.verifyCredential should not be called directly')
    throw new Error('Email authentication is handled by auth routes directly')
  }
}
