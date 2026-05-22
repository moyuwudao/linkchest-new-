/**
 * 支付宝登录 Provider
 * 实现支付宝 OAuth2 授权登录
 */

import type { AuthProvider, OAuthCredential, AuthResult } from './types'
import logger from '../../lib/logger'
import crypto from 'crypto'

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || ''
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || ''
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || ''

const ALIPAY_BASE_URL = 'https://openapi.alipay.com/gateway.do'

export class AlipayAuthProvider implements AuthProvider {
  readonly name = 'alipay_auth' as const

  isConfigured(): boolean {
    return !!(ALIPAY_APP_ID && ALIPAY_PRIVATE_KEY && ALIPAY_PUBLIC_KEY)
  }

  /**
   * 生成支付宝签名（RSA2）
   */
  private sign(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
      .sort()
      .map((k) => `${k}=${String(params[k])}`)
      .join('&')

    const sign = crypto.createSign('RSA-SHA256')
    sign.update(sorted)
    return sign.sign(ALIPAY_PRIVATE_KEY, 'base64')
  }

  /**
   * 构建通用请求参数
   */
  private buildCommonParams(method: string): Record<string, unknown> {
    return {
      app_id: ALIPAY_APP_ID,
      method,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
    }
  }

  /**
   * 用 auth_code 换取 access_token
   */
  private async getAccessToken(authCode: string): Promise<{
    access_token: string
    user_id: string
    expires_in: number
    refresh_token: string
  }> {
    const bizContent = {
      grant_type: 'authorization_code',
      code: authCode,
    }

    const commonParams = this.buildCommonParams('alipay.system.oauth.token')
    const requestParams = {
      ...commonParams,
      biz_content: JSON.stringify(bizContent),
    }

    const sign = this.sign(requestParams)
    const queryParams = new URLSearchParams()
    Object.entries(requestParams).forEach(([k, v]) => {
      queryParams.append(k, String(v))
    })
    queryParams.append('sign', sign)

    const res = await fetch(`${ALIPAY_BASE_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const data = await res.json() as {
      alipay_system_oauth_token_response?: {
        access_token?: string
        user_id?: string
        expires_in?: string
        refresh_token?: string
      }
      error_response?: {
        code?: string
        msg?: string
      }
    }

    const response = data.alipay_system_oauth_token_response
    if (!response || !response.access_token || !response.user_id) {
      logger.error({ data, authCode }, 'Alipay get access token failed')
      throw new Error(`Alipay auth failed: ${data.error_response?.msg || 'Unknown error'}`)
    }

    return {
      access_token: response.access_token,
      user_id: response.user_id,
      expires_in: parseInt(response.expires_in || '1296000', 10),
      refresh_token: response.refresh_token || '',
    }
  }

  /**
   * 获取用户信息
   */
  private async fetchUserInfo(accessToken: string): Promise<{
    nick_name: string
    avatar: string
    email?: string
  }> {
    const bizContent = {
      auth_token: accessToken,
    }

    const commonParams = this.buildCommonParams('alipay.user.info.share')
    const requestParams = {
      ...commonParams,
      biz_content: JSON.stringify(bizContent),
      auth_token: accessToken,
    }

    const sign = this.sign(requestParams)
    const queryParams = new URLSearchParams()
    Object.entries(requestParams).forEach(([k, v]) => {
      queryParams.append(k, String(v))
    })
    queryParams.append('sign', sign)

    const res = await fetch(`${ALIPAY_BASE_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const data = await res.json() as {
      alipay_user_info_share_response?: {
        nick_name?: string
        avatar?: string
        email?: string
        code?: string
        msg?: string
      }
      error_response?: {
        code?: string
        msg?: string
      }
    }

    const response = data.alipay_user_info_share_response
    if (!response || response.code !== '10000') {
      logger.error({ data }, 'Alipay get user info failed')
      throw new Error(`Alipay get user info failed: ${response?.msg || data.error_response?.msg || 'Unknown error'}`)
    }

    return {
      nick_name: response.nick_name || '',
      avatar: response.avatar || '',
      email: response.email,
    }
  }

  async verifyCredential(credential: OAuthCredential): Promise<AuthResult> {
    const { token } = credential

    if (!token) {
      throw new Error('Alipay auth code is required')
    }

    // 1. 用 auth_code 换 token
    const tokenData = await this.getAccessToken(token)

    // 2. 获取用户信息
    const userInfo = await this.fetchUserInfo(tokenData.access_token)

    return {
      success: true,
      providerUserId: tokenData.user_id,
      email: userInfo.email || '',
      name: userInfo.nick_name || '',
      avatar: userInfo.avatar || null,
      rawProfile: {
        user_id: tokenData.user_id,
        ...userInfo,
      },
    }
  }
}
