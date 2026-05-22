/**
 * 页面类型分类服务
 * 根据URL和平台自动分类页面类型
 */

export interface ClassificationResult {
  type: string
  confidence: number
  platform?: string
  category?: string
}

/**
 * 根据URL和平台分类页面类型
 */
export function classifyUrl(url: string, platform?: string): ClassificationResult {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathname = urlObj.pathname.toLowerCase()

    // 根据平台判断
    if (platform) {
      const platformLower = platform.toLowerCase()

      // 视频平台
      if (['bilibili', 'youtube', 'douyin', 'tiktok', 'kuaishou'].includes(platformLower)) {
        return {
          type: 'video',
          confidence: 0.95,
          platform: platformLower,
          category: 'short_video'
        }
      }

      // 社交媒体
      if (['twitter', 'x', 'weibo', 'xiaohongshu', 'instagram'].includes(platformLower)) {
        return {
          type: 'social',
          confidence: 0.9,
          platform: platformLower,
          category: 'social_media'
        }
      }

      // 技术平台
      if (['github', 'gitlab', 'stackoverflow', 'juejin', 'csdn'].includes(platformLower)) {
        return {
          type: 'technical',
          confidence: 0.9,
          platform: platformLower,
          category: 'developer'
        }
      }
    }

    // 根据URL特征判断
    if (pathname.match(/\.(mp4|avi|mov|wmv|flv|mkv|webm)(\?.*)?$/)) {
      return { type: 'video', confidence: 0.95, category: 'video_file' }
    }

    if (pathname.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)(\?.*)?$/)) {
      return { type: 'document', confidence: 0.9, category: 'document_file' }
    }

    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/)) {
      return { type: 'image', confidence: 0.9, category: 'image_file' }
    }

    if (pathname.match(/\.(mp3|wav|flac|aac|ogg|m4a)(\?.*)?$/)) {
      return { type: 'audio', confidence: 0.9, category: 'audio_file' }
    }

    // 根据域名判断
    if (hostname.includes('github.com')) {
      return { type: 'technical', confidence: 0.9, platform: 'github', category: 'repository' }
    }

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { type: 'video', confidence: 0.95, platform: 'youtube', category: 'video_platform' }
    }

    if (hostname.includes('bilibili.com')) {
      return { type: 'video', confidence: 0.95, platform: 'bilibili', category: 'video_platform' }
    }

    if (hostname.includes('douyin.com') || hostname.includes('iesdouyin.com')) {
      return { type: 'video', confidence: 0.95, platform: 'douyin', category: 'short_video' }
    }

    if (hostname.includes('xiaohongshu.com')) {
      return { type: 'social', confidence: 0.9, platform: 'xiaohongshu', category: 'lifestyle' }
    }

    if (hostname.includes('zhihu.com')) {
      return { type: 'article', confidence: 0.9, platform: 'zhihu', category: 'knowledge' }
    }

    if (hostname.includes('juejin.cn')) {
      return { type: 'technical', confidence: 0.9, platform: 'juejin', category: 'developer' }
    }

    // 默认分类
    return {
      type: 'webpage',
      confidence: 0.6,
      category: 'general'
    }
  } catch (error) {
    // URL解析失败，返回默认分类
    return {
      type: 'unknown',
      confidence: 0,
      category: 'unknown'
    }
  }
}
