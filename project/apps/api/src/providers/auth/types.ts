/**
 * 认证 Provider 统一接口
 * 所有登录渠道（邮箱、Google、Apple、微信）
 * 必须实现此接口，确保核心认证流程统一
 */

/** 支持的认证来源类型 */
export type AuthSource =
  | 'email'
  | 'google'
  | 'apple'
  | 'wechat'

/** 第三方登录凭证 */
export interface OAuthCredential {
  /** ID Token（Google、Apple）或 Access Token（Facebook、微信、支付宝） */
  token: string
  /** 可选的额外数据 */
  extra?: Record<string, unknown>
  /** 平台标识（用于区分移动端和网页端微信登录） */
  platform?: string
}

/** 认证结果 */
export interface AuthResult {
  success: boolean
  /** 第三方用户唯一标识 */
  providerUserId: string
  email: string | null
  name: string
  avatar?: string | null
  /** 原始响应（用于调试） */
  rawProfile?: unknown
}

/** 认证 Provider 统一接口 */
export interface AuthProvider {
  /** Provider 唯一标识 */
  readonly name: AuthSource

  /** 是否已配置 */
  isConfigured(): boolean

  /** 验证 OAuth 凭证并获取用户信息 */
  verifyCredential(credential: OAuthCredential): Promise<AuthResult>
}

/** Provider 构造函数类型 */
export type AuthProviderConstructor = new () => AuthProvider
