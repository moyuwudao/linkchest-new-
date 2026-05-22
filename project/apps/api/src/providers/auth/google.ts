/**
 * Google OAuth Provider
 * 从原有的 routes/auth.ts 重构而来
 */

import type { AuthProvider, OAuthCredential, AuthResult } from './types'
import logger from '../../lib/logger'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

export class GoogleAuthProvider implements AuthProvider {
  readonly name = 'google' as const

  isConfigured(): boolean {
    return !!GOOGLE_CLIENT_ID
  }

  async verifyCredential(credential: OAuthCredential): Promise<AuthResult> {
    const { token } = credential

    if (!token) {
      throw new Error('Google ID token is required')
    }

    // 验证 Google ID Token
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    )

    if (!googleRes.ok) {
      throw new Error('Invalid Google token')
    }

    const googleData = await googleRes.json() as {
      sub: string
      email: string
      name: string
      picture?: string
      aud: string
      email_verified?: string
    }

    // 验证 audience
    if (googleData.aud !== GOOGLE_CLIENT_ID) {
      logger.error(
        { expected: GOOGLE_CLIENT_ID, received: googleData.aud },
        'Google OAuth audience mismatch'
      )
      throw new Error('Invalid Google token audience')
    }

    return {
      success: true,
      providerUserId: googleData.sub,
      email: null,
      name: googleData.name,
      avatar: googleData.picture || null,
      rawProfile: googleData,
    }
  }
}
