/**
 * 极光推送服务
 * 国内版推送服务封装
 */

import JPush from 'jpush-async';
import { prisma } from '../lib/prisma';

// 初始化极光推送客户端
let jpushClient: any = null;

function getClient() {
  if (!jpushClient) {
    const appKey = process.env.JPUSH_APPKEY;
    const masterSecret = process.env.JPUSH_MASTER_SECRET;
    
    if (!appKey || !masterSecret) {
      console.warn('[Push] JPush not configured');
      return null;
    }
    
    jpushClient = JPush.buildClient(appKey, masterSecret);
  }
  return jpushClient;
}

/**
 * 向指定用户发送推送
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  content: string,
  extras?: Record<string, any>
) {
  const client = getClient();
  if (!client) {
    console.log('[Push] JPush not configured, skip push');
    return;
  }

  try {
    // 查询用户的推送 token
    const pushToken = await prisma.pushToken.findFirst({
      where: { userId, platform: 'jpush' },
    });

    if (!pushToken) {
      console.log('[Push] No push token for user:', userId);
      return;
    }

    // 构建推送
    const push = client.push()
      .setPlatform(JPush.ALL)
      .setAudience(JPush.registration_id(pushToken.token))
      .setNotification(
        title,
        JPush.ios(content, 'sound', 1, extras),
        JPush.android(content, title, 1, extras)
      );

    // 发送
    await push.send();
    console.log('[Push] Sent to user:', userId);
  } catch (error) {
    console.error('[Push] Failed to send push:', error);
    throw error;
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
  const client = getClient();
  if (!client) return;

  try {
    const pushTokens = await prisma.pushToken.findMany({
      where: {
        userId: { in: userIds },
        platform: 'jpush',
      },
    });

    if (pushTokens.length === 0) {
      console.log('[Push] No push tokens found');
      return;
    }

    const tokens = pushTokens.map((t) => t.token);

    await client.push()
      .setPlatform(JPush.ALL)
      .setAudience(JPush.registration_id(tokens))
      .setNotification(
        title,
        JPush.ios(content, 'sound', 1, extras),
        JPush.android(content, title, 1, extras)
      )
      .send();

    console.log('[Push] Sent to', pushTokens.length, 'users');
  } catch (error) {
    console.error('[Push] Failed to send batch push:', error);
    throw error;
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
  const client = getClient();
  if (!client) return;

  try {
    await client.push()
      .setPlatform(JPush.ALL)
      .setAudience(JPush.ALL)
      .setNotification(
        title,
        JPush.ios(content, 'sound', 1, extras),
        JPush.android(content, title, 1, extras)
      )
      .send();

    console.log('[Push] Broadcast sent');
  } catch (error) {
    console.error('[Push] Failed to broadcast:', error);
    throw error;
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
  const title = '会员即将到期';
  const content =
    daysLeft <= 0
      ? `您的${tierName}会员已过期，续费可继续享受专业功能`
      : `您的${tierName}会员将在${daysLeft}天后到期，请及时续费`;

  await sendPushToUser(userId, title, content, {
    screen: 'TierUpgrade',
    type: 'subscription_reminder',
    daysLeft,
  });
}

/**
 * 系统公告
 */
export async function sendSystemAnnouncement(
  userIds: string[],
  title: string,
  content: string
) {
  await sendPushToUsers(userIds, title, content, {
    screen: 'Profile',
    type: 'system_announcement',
  });
}
