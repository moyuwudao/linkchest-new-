/**
 * 推送服务（多通道）
 *
 * 国内版（MARKET=china）：使用极光（JPush）
 * 海外版（MARKET=global）：使用 Firebase Cloud Messaging（FCM）
 *
 * 配置文件：
 * - 国内：JPUSH_APPKEY / JPUSH_MASTER_SECRET
 * - 海外：FCM_SERVER_KEY（Legacy HTTP API 的 server key，从 Firebase Console 获取）
 *
 * 注意：FCM Legacy HTTP API 即将于 2024-06-20 弃用，
 * 后续应迁移到 FCM HTTP v1 API（需要 firebase-admin SDK + service account JSON）。
 * 详见：https://firebase.google.com/docs/cloud-messaging/migrate-v1
 */

import JPush from 'jpush-async'
import prisma from '../lib/prisma'

// ============ 极光（国内）============
let jpushClient: any = null

function getJpushClient() {
  if (!jpushClient) {
    const appKey = process.env.JPUSH_APPKEY
    const masterSecret = process.env.JPUSH_MASTER_SECRET
    if (!appKey || !masterSecret) {
      return null
    }
    jpushClient = JPush.buildClient(appKey, masterSecret)
  }
  return jpushClient
}

// ============ FCM（海外）============
let fcmConfigured = false
function getFcmServerKey(): string | null {
  if (!fcmConfigured) {
    const key = process.env.FCM_SERVER_KEY
    if (key) fcmConfigured = true
    return key || null
  }
  return process.env.FCM_SERVER_KEY || null
}

interface FcmMessage {
  to: string
  title: string
  body: string
  data?: Record<string, any>
}

/**
 * 发送 FCM 推送（海外版）
 * 使用 FCM Legacy HTTP API（无 SDK 依赖）
 */
async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ ok: boolean; error?: string }> {
  const serverKey = getFcmServerKey()
  if (!serverKey) {
    return { ok: false, error: 'FCM_SERVER_KEY_NOT_CONFIGURED' }
  }

  const msg: FcmMessage = { to: token, title, body, data }
  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: msg.to,
        notification: {
          title: msg.title,
          body: msg.body,
          sound: 'default',
        },
        data: msg.data || {},
        priority: 'high',
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `FCM_HTTP_${res.status}: ${errText}` }
    }

    const result = (await res.json()) as { success?: number; failure?: number; results?: any[] }
    if (result.failure && result.failure > 0) {
      return { ok: false, error: JSON.stringify(result.results?.[0] || result) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ============ 通道选择 ============
type PushPlatform = 'jpush' | 'fcm'

function getCurrentPlatform(): PushPlatform {
  return process.env.MARKET === 'global' ? 'fcm' : 'jpush'
}

function getTokenPlatformInDb(): string {
  // 数据库存的 platform 标识
  return getCurrentPlatform() === 'fcm' ? 'fcm' : 'jpush'
}

// ============ 公共 API ============

/**
 * 向指定用户发送推送（自动按 MARKET 选择通道）
 * 国内 → JPush；海外 → FCM
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  content: string,
  extras?: Record<string, any>
) {
  const platform = getCurrentPlatform()
  const dbPlatform = getTokenPlatformInDb()

  try {
    // 查询用户注册的推送 token
    const pushToken = await prisma.pushToken.findFirst({
      where: { userId, platform: dbPlatform },
    })

    if (!pushToken) {
      console.log(`[Push] No ${dbPlatform} token for user:`, userId)
      return
    }

    if (platform === 'fcm') {
      const result = await sendFcmPush(pushToken.token, title, content, extras)
      if (!result.ok) {
        console.warn(`[Push/FCM] Failed to send to user ${userId}:`, result.error)
        return
      }
      console.log(`[Push/FCM] Sent to user:`, userId)
    } else {
      const client = getJpushClient()
      if (!client) {
        console.log('[Push/JPush] Not configured, skip')
        return
      }
      await client
        .push()
        .setPlatform(JPush.ALL)
        .setAudience(JPush.registration_id(pushToken.token))
        .setNotification(
          title,
          JPush.ios(content, 'sound', 1, extras),
          JPush.android(content, title, 1, extras)
        )
        .send()
      console.log(`[Push/JPush] Sent to user:`, userId)
    }
  } catch (error) {
    console.error(`[Push] Failed to send push to ${userId}:`, error)
    throw error
  }
}

/**
 * 向多个用户发送推送（批量）
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  content: string,
  extras?: Record<string, any>
) {
  const platform = getCurrentPlatform()
  const dbPlatform = getTokenPlatformInDb()

  try {
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId: { in: userIds }, platform: dbPlatform },
    })
    if (pushTokens.length === 0) {
      console.log(`[Push] No ${dbPlatform} tokens found`)
      return
    }

    if (platform === 'fcm') {
      const serverKey = getFcmServerKey()
      if (!serverKey) return
      // FCM Legacy 一次最多 1000 个 token
      const tokens = pushTokens.map((t) => t.token)
      for (let i = 0; i < tokens.length; i += 1000) {
        const batch = tokens.slice(i, i + 1000)
        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${serverKey}`,
          },
          body: JSON.stringify({
            registration_ids: batch,
            notification: { title, body: content, sound: 'default' },
            data: extras || {},
            priority: 'high',
          }),
        })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          console.warn(`[Push/FCM] Batch failed ${res.status}: ${t}`)
        }
      }
      console.log(`[Push/FCM] Sent to ${pushTokens.length} users`)
    } else {
      const client = getJpushClient()
      if (!client) return
      const tokens = pushTokens.map((t) => t.token)
      await client
        .push()
        .setPlatform(JPush.ALL)
        .setAudience(JPush.registration_id(tokens))
        .setNotification(
          title,
          JPush.ios(content, 'sound', 1, extras),
          JPush.android(content, title, 1, extras)
        )
        .send()
      console.log(`[Push/JPush] Sent to ${pushTokens.length} users`)
    }
  } catch (error) {
    console.error('[Push] Batch push failed:', error)
    throw error
  }
}

/**
 * 广播推送（所有用户）
 */
export async function broadcastPush(
  title: string,
  content: string,
  extras?: Record<string, any>
) {
  const platform = getCurrentPlatform()
  const dbPlatform = getTokenPlatformInDb()

  try {
    if (platform === 'fcm') {
      // FCM 广播：topics/send - 简化起见直接 broadcast
      console.log('[Push/FCM] Broadcast not implemented for FCM legacy, use topic')
      return
    }
    const client = getJpushClient()
    if (!client) return
    await client
      .push()
      .setPlatform(JPush.ALL)
      .setAudience(JPush.ALL)
      .setNotification(
        title,
        JPush.ios(content, 'sound', 1, extras),
        JPush.android(content, title, 1, extras)
      )
      .send()
    console.log('[Push/JPush] Broadcast sent')
  } catch (error) {
    console.error('[Push] Failed to broadcast:', error)
    throw error
  }
}

/**
 * 会员到期提醒
 */
export async function sendSubscriptionReminder(
  userId: string,
  daysLeft: number,
  tierName: string
) {
  const title = '会员即将到期'
  const content =
    daysLeft <= 0
      ? `您的${tierName}会员已过期，续费可继续享受专业功能`
      : `您的${tierName}会员将在${daysLeft}天后到期，请及时续费`

  await sendPushToUser(userId, title, content, {
    screen: 'TierUpgrade',
    type: 'subscription_reminder',
    daysLeft,
  })
}

/**
 * 系统公告
 */
export async function sendSystemAnnouncement(
  _userId: string,
  _title: string,
  _content: string
) {
  // 暂不实现，保留扩展位
  console.log('[Push] System announcement: (not implemented in detail)')
}
