/**
 * 内容审核服务
 * 使用腾讯云内容安全 API 进行内容检测
 * 
 * 审核内容类型：
 * - 文本审核（Text Moderation）
 * - 图片审核（Image Moderation）
 * - 视频审核（Video Moderation）
 * - 音频审核（Audio Moderation）
 * 
 * 风险等级：
 * - PASS: 正常
 * - REVIEW: 需要人工审核
 * - BLOCK: 违规，禁止发布
 */

// import { TencentCloudSDK } from '../lib/tencentcloud'
import logger from '../lib/logger'

export type ModerationResult = 'PASS' | 'REVIEW' | 'BLOCK'

export interface ModerationResponse {
  result: ModerationResult
  suggestion: string
  details?: Array<{
    label: string
    score: number
    subLabel?: string
  }>
}

export interface TextModerationParams {
  content: string
  scene?: 'chat' | 'forum' | 'article' | 'advertisement'
}

export interface ImageModerationParams {
  imageUrl: string
  scene?: 'avatar' | 'post' | 'advertisement' | 'custom'
}

export interface VideoModerationParams {
  videoUrl: string
  duration?: number
  scene?: 'live' | 'vod' | 'short_video'
}

export interface AudioModerationParams {
  audioUrl: string
  duration?: number
  scene?: 'live' | 'vod' | 'voice_message'
}

export class ContentModerationService {
  private client: any

  constructor() {
    this.client = null
  }

  /**
   * 初始化腾讯云内容安全客户端
   */
  private async getClient(): Promise<any> {
    if (this.client) return this.client

    const secretId = process.env.TENCENTCLOUD_SECRET_ID
    const secretKey = process.env.TENCENTCLOUD_SECRET_KEY

    if (!secretId || !secretKey) {
      logger.warn('Content moderation not configured, skipping')
      throw new Error('Tencent Cloud credentials not configured')
    }

    try {
      const tencentcloudModule = await import('../lib/tencentcloud').catch(() => null)
      if (!tencentcloudModule) {
        throw new Error('TencentCloud SDK not available')
      }
      const TencentCloudSDK = (tencentcloudModule as any).TencentCloudSDK
      const sdk = new TencentCloudSDK(secretId, secretKey)
      this.client = sdk.getClient('ims', '2020-07-13', 'ap-beijing')
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Failed to initialize content moderation client')
      throw err
    }

    return this.client
  }

  /**
   * 文本内容审核
   */
  async moderateText(params: TextModerationParams): Promise<ModerationResponse> {
    const { content, scene = 'forum' } = params

    if (!content || content.length === 0) {
      return { result: 'PASS', suggestion: 'Empty content' }
    }

    try {
      const client = await this.getClient()

      const response = await client.TextModeration({
        Content: Buffer.from(content).toString('base64'),
        ContentType: 'text/plain',
        Scene: this.getSceneValue(scene),
      })

      return this.parseResponse(response)
    } catch (err) {
      logger.error({ err: (err as Error).message, contentLength: content.length }, 'Text moderation failed')
      // 如果审核服务不可用，默认通过（降级策略）
      return { result: 'PASS', suggestion: 'Moderation service unavailable' }
    }
  }

  /**
   * 图片内容审核
   */
  async moderateImage(params: ImageModerationParams): Promise<ModerationResponse> {
    const { imageUrl, scene = 'post' } = params

    if (!imageUrl) {
      return { result: 'PASS', suggestion: 'Empty image URL' }
    }

    try {
      const client = await this.getClient()

      const response = await client.ImageModeration({
        Url: imageUrl,
        Scene: this.getSceneValue(scene),
      })

      return this.parseResponse(response)
    } catch (err) {
      logger.error({ err: (err as Error).message, imageUrl }, 'Image moderation failed')
      return { result: 'PASS', suggestion: 'Moderation service unavailable' }
    }
  }

  /**
   * 视频内容审核
   */
  async moderateVideo(params: VideoModerationParams): Promise<ModerationResponse> {
    const { videoUrl, duration = 60, scene = 'vod' } = params

    if (!videoUrl) {
      return { result: 'PASS', suggestion: 'Empty video URL' }
    }

    try {
      const client = await this.getClient()

      const response = await client.VideoModeration({
        Url: videoUrl,
        Duration: duration,
        Scene: this.getSceneValue(scene),
      })

      return this.parseResponse(response)
    } catch (err) {
      logger.error({ err: (err as Error).message, videoUrl }, 'Video moderation failed')
      return { result: 'PASS', suggestion: 'Moderation service unavailable' }
    }
  }

  /**
   * 音频内容审核
   */
  async moderateAudio(params: AudioModerationParams): Promise<ModerationResponse> {
    const { audioUrl, duration = 60, scene = 'vod' } = params

    if (!audioUrl) {
      return { result: 'PASS', suggestion: 'Empty audio URL' }
    }

    try {
      const client = await this.getClient()

      const response = await client.AudioModeration({
        Url: audioUrl,
        Duration: duration,
        Scene: this.getSceneValue(scene),
      })

      return this.parseResponse(response)
    } catch (err) {
      logger.error({ err: (err as Error).message, audioUrl }, 'Audio moderation failed')
      return { result: 'PASS', suggestion: 'Moderation service unavailable' }
    }
  }

  /**
   * 批量文本审核
   */
  async moderateTexts(texts: string[], scene?: TextModerationParams['scene']): Promise<ModerationResponse[]> {
    return Promise.all(texts.map((text) => this.moderateText({ content: text, scene })))
  }

  /**
   * 将场景字符串转换为腾讯云 API 值
   */
  private getSceneValue(scene: string): string {
    const sceneMap: Record<string, string> = {
      chat: '1',
      forum: '2',
      article: '3',
      advertisement: '4',
      avatar: '1',
      post: '2',
      live: '5',
      vod: '6',
      short_video: '7',
      voice_message: '8',
      custom: '9',
    }
    return sceneMap[scene] || '2' // 默认使用论坛场景
  }

  /**
   * 解析腾讯云 API 响应
   */
  private parseResponse(response: any): ModerationResponse {
    const result = response.Response || response

    if (!result || !result.Suggestion) {
      return { result: 'PASS', suggestion: 'No result' }
    }

    const suggestion = result.Suggestion
    let moderationResult: ModerationResult = 'PASS'

    switch (suggestion) {
      case 'BLOCK':
        moderationResult = 'BLOCK'
        break
      case 'REVIEW':
        moderationResult = 'REVIEW'
        break
      case 'PASS':
      default:
        moderationResult = 'PASS'
    }

    const details = result.LabelResults?.map((labelResult: any) => ({
      label: labelResult.Label || '',
      score: labelResult.Score || 0,
      subLabel: labelResult.SubLabel,
    })) || []

    return {
      result: moderationResult,
      suggestion,
      details,
    }
  }

  /**
   * 检查审核结果是否允许发布
   */
  isAllowed(result: ModerationResult): boolean {
    return result !== 'BLOCK'
  }

  /**
   * 检查是否需要人工审核
   */
  needsReview(result: ModerationResult): boolean {
    return result === 'REVIEW'
  }
}

// 单例实例
export const contentModerationService = new ContentModerationService()

// 便捷函数
export async function moderateText(content: string, scene?: TextModerationParams['scene']): Promise<ModerationResponse> {
  return contentModerationService.moderateText({ content, scene })
}

export async function moderateImage(imageUrl: string, scene?: ImageModerationParams['scene']): Promise<ModerationResponse> {
  return contentModerationService.moderateImage({ imageUrl, scene })
}