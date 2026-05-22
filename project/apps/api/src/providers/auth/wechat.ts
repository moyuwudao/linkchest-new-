/**
 * 微信登录 Provider
 * 实现微信 OAuth2 网页授权登录
 */

import type { AuthProvider, OAuthCredential, AuthResult } from './types'
import logger from '../../lib/logger'

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || ''
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || ''

export class WechatAuthProvider implements AuthProvider {
  readonly name = 'wechat' as const

  isConfigured(): boolean {
    return !!(WECHAT_APP_ID && WECHAT_APP_SECRET)
  }

  /**
   * 用 code 换取 access_token 和 openid
   */
  private async getAccessToken(code: string): Promise<{
    access_token: string
    openid: string
    unionid?: string
    expires_in: number
    refresh_token: string
  }> {
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`

    const res = await fetch(url)
    const data = await res.json() as {
      access_token?: string
      openid?: string
      unionid?: string
      expires_in?: number
      refresh_token?: string
      errcode?: number
      errmsg?: string
    }

    if (data.errcode) {
      logger.error({ data, code }, 'WeChat get access token failed')
      throw new Error(`WeChat auth failed: ${data.errmsg || data.errcode}`)
    }

    if (!data.access_token || !data.openid) {
      throw new Error('WeChat auth failed: invalid response')
    }

    return {
      access_token: data.access_token,
      openid: data.openid,
      unionid: data.unionid,
      expires_in: data.expires_in || 7200,
      refresh_token: data.refresh_token || '',
    }
  }

  /**
   * 获取用户信息
   */
  private async getUserInfo(accessToken: string, openid: string): Promise<{
    nickname: string
    headimgurl: string
    sex: number
  }> {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`

    const res = await fetch(url)
    const data = await res.json() as {
      nickname?: string
      headimgurl?: string
      sex?: number
      errcode?: number
      errmsg?: string
    }

    if (data.errcode) {
      logger.error({ data, openid }, 'WeChat get user info failed')
      throw new Error(`WeChat get user info failed: ${data.errmsg || data.errcode}`)
    }

    return {
      nickname: data.nickname || '',
      headimgurl: data.headimgurl || '',
      sex: data.sex || 0,
    }
  }

  async verifyCredential(credential: OAuthCredential): Promise<AuthResult> {
    const { token } = credential

    if (!token) {
      throw new Error('WeChat auth code is required')
    }

    // 1. 用 code 换 token
    const tokenData = await this.getAccessToken(token)

    // 2. 获取用户信息
    const userInfo = await this.getUserInfo(tokenData.access_token, tokenData.openid)

    return {
      success: true,
      providerUserId: tokenData.openid,
      email: '', // 微信不返回邮箱
      name: userInfo.nickname || '',
      avatar: userInfo.headimgurl || null,
      rawProfile: {
        openid: tokenData.openid,
        unionid: tokenData.unionid,
        ...userInfo,
      },
    }
  }
}
