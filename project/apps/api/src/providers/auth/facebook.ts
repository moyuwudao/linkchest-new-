/**
 * Facebook Login Provider
 * 基于 Facebook Graph API
 *
 * Facebook OAuth 验证流程：
 * 1. 客户端通过 Facebook SDK 获取 accessToken
 * 2. 后端调用 /debug_token 验证 token 有效性
 * 3. 调用 /me 获取用户信息（id, name, email, picture）
 * 4. 返回标准化用户信息
 */

import type { AuthProvider, OAuthCredential, AuthResult } from './types'
import logger from '../../lib/logger'
import axios from 'axios'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || ''
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''

// Facebook Graph API 基础 URL
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0'

export class FacebookAuthProvider implements AuthProvider {
  readonly name = 'facebook' as const

  isConfigured(): boolean {
    return !!FACEBOOK_APP_ID && !!FACEBOOK_APP_SECRET
  }

  async verifyCredential(credential: OAuthCredential): Promise<AuthResult> {
    const { token } = credential

    if (!token) {
      throw new Error('Facebook access token is required')
    }

    // 1. 验证 accessToken 有效性
    const debugResult = await this.debugToken(token)
    if (!debugResult.isValid) {
      throw new Error('Invalid Facebook access token')
    }

    // 2. 获取用户信息
    const userInfo = await this.getUserInfo(token)

    logger.info({ facebookId: userInfo.id }, 'Facebook login verified')

    return {
      success: true,
      providerUserId: userInfo.id,
      email: userInfo.email || '',
      name: userInfo.name || '',
      avatar: userInfo.picture?.data?.url || null,
      rawProfile: userInfo,
    }
  }

  /**
   * 调用 Facebook /debug_token 验证 token
   */
  private async debugToken(accessToken: string): Promise<{ isValid: boolean; appId?: string; userId?: string }> {
    try {
      const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: appAccessToken,
        },
        timeout: 10000,
      })

      const data = response.data.data

      return {
        isValid: data.is_valid === true && data.app_id === FACEBOOK_APP_ID,
        appId: data.app_id,
        userId: data.user_id,
      }
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Facebook debug_token failed')
      return { isValid: false }
    }
  }

  /**
   * 调用 Facebook /me 获取用户信息
   */
  private async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,email,picture.type(large)',
        },
        timeout: 10000,
      })

      return response.data
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Facebook /me failed')
      throw new Error('Failed to get Facebook user info')
    }
  }
}
