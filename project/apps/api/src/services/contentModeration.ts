/**
 * 腾讯云内容安全 (TMS) 服务
 * 文本内容审核封装
 */

import * as tencentcloud from 'tencentcloud-sdk-nodejs';

const TmsClient = tencentcloud.tms.v20201229.Client;

// 初始化客户端
let client: any = null;

function getClient() {
  if (!client) {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;

    if (!secretId || !secretKey) {
      console.warn('[TMS] 未配置腾讯云密钥');
      return null;
    }

    client = new TmsClient({
      credential: {
        secretId,
        secretKey,
      },
      region: 'ap-guangzhou',
      profile: {
        signMethod: 'TC3-HMAC-SHA256',
        httpProfile: {
          reqMethod: 'POST',
          reqTimeout: 30,
        },
      },
    });
  }
  return client;
}

export interface ModerationResult {
  safe: boolean;
  label?: string;
  confidence?: number;
  keywords?: string[];
  suggestion?: string;
}

/**
 * 文本内容审核
 * @param content 待审核文本
 * @param dataId 数据标识（可选）
 * @param bizType 策略BizType（可选，用于区分审核场景）
 * @returns 审核结果
 */
export async function moderateText(
  content: string,
  dataId?: string,
  bizType?: string
): Promise<ModerationResult> {
  const tmsClient = getClient();

  // 未配置时默认放行
  if (!tmsClient) {
    return { safe: true };
  }

  // 空内容直接放行
  if (!content || content.trim().length === 0) {
    return { safe: true };
  }

  try {
    const params: any = {
      Content: Buffer.from(content).toString('base64'),
    };

    if (dataId) {
      params.DataId = dataId;
    }

    if (bizType) {
      params.BizType = bizType;
    }

    const result = await tmsClient.TextModeration(params);

    // 解析结果
    // Suggestion: Pass / Block / Review
    const suggestion = result.Suggestion;
    const label = result.Label;
    const confidence = result.Confidence;
    const keywords = result.Keywords || [];

    return {
      safe: suggestion === 'Pass',
      label,
      confidence,
      keywords,
      suggestion,
    };
  } catch (error) {
    console.error('[TMS] 审核失败:', error);
    // 审核失败时默认放行，避免阻塞业务
    return { safe: true };
  }
}

/**
 * 批量文本审核
 * @param items { id, content } 数组
 * @returns 审核结果数组
 */
export async function moderateTextBatch(
  items: Array<{ id: string; content: string }>
): Promise<Array<{ id: string; result: ModerationResult }>> {
  const results = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      result: await moderateText(item.content, item.id),
    }))
  );
  return results;
}

/**
 * 审核用户昵称
 */
export async function moderateNickname(nickname: string, userId: string) {
  return moderateText(nickname, `nickname_${userId}`);
}

/**
 * 审核收藏标题
 */
export async function moderateCollectionTitle(title: string, collectionId?: string) {
  return moderateText(title, collectionId ? `collection_title_${collectionId}` : undefined);
}

/**
 * 审核收藏备注
 */
export async function moderateCollectionNote(note: string, collectionId?: string) {
  return moderateText(note, collectionId ? `collection_note_${collectionId}` : undefined);
}

// 分享内容审核策略 BizType
const SHARE_BIZ_TYPE = 'share_content';

/**
 * 审核分享标题
 */
export async function moderateShareTitle(title: string, shareId?: string) {
  return moderateText(title, shareId ? `share_title_${shareId}` : undefined, SHARE_BIZ_TYPE);
}

/**
 * 审核分享描述
 */
export async function moderateShareDescription(description: string, shareId?: string) {
  return moderateText(description, shareId ? `share_desc_${shareId}` : undefined, SHARE_BIZ_TYPE);
}
