/**
 * Apple Sign In Provider
 * 实现 Apple OAuth2 授权登录验证
 * 
 * Apple Sign In 验证流程：
 * 1. 客户端通过 ASAuthorizationAppleIDButton 获取 authorizationCode 或 id_token
 * 2. 后端使用 Apple 的公钥验证 id_token 的签名
 * 3. 从 id_token 中提取用户信息
 */

import type { AuthProvider, OAuthCredential, AuthResult } from './types'
import logger from '../../lib/logger'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || ''
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || ''

// Apple 公钥获取客户端
const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10分钟
})

function getPublicKey(header: jwt.JwtHeader, callback: (err: Error | null, publicKey?: string) => void) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err)
    }
    const publicKey = key?.getPublicKey()
    callback(null, publicKey)
  })
}

export class AppleAuthProvider implements AuthProvider {
  readonly name = 'apple' as const

  isConfigured(): boolean {
    return !!(APPLE_CLIENT_ID && APPLE_TEAM_ID)
  }

  async verifyCredential(credential: OAuthCredential): Promise<AuthResult> {
    const { token } = credential

    if (!token) {
      throw new Error('Apple ID token is required')
    }

    return new Promise((resolve, reject) => {
      jwt.verify(token, getPublicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: APPLE_CLIENT_ID,
      }, (err, decoded) => {
        if (err) {
          logger.error({ err: err.message }, 'Apple token verification failed')
          return reject(new Error('Invalid Apple token'))
        }

        const appleData = decoded as {
          sub: string
          email: string
          email_verified?: boolean
          is_private_email?: boolean
          auth_time?: number
        }

        // 验证团队 ID（通过 aud 或自定义验证）
        // Apple 的 id_token 中没有直接包含 team_id，需要通过其他方式验证

        // 验证邮箱
        if (appleData.email_verified !== true && !appleData.is_private_email) {
          logger.warn({ email: appleData.email }, 'Apple email not verified')
        }

        resolve({
          success: true,
          providerUserId: appleData.sub,
          email: appleData.email || '',
          name: '', // Apple 不返回用户名，需要客户端传递或让用户设置
          avatar: null, // Apple 不返回头像
          rawProfile: appleData,
        })
      })
    })
  }
}