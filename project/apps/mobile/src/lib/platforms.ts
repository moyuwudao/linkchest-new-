// 平台配置常量（移动端）— 91个平台，按 S/A/B/C 优先级分级
// 与后端 apps/api/src/services/platforms.ts 的 SUPPORTED_PLATFORMS 保持同步

export type PlatformPriority = 'S' | 'A' | 'B' | 'C'

export interface PlatformConfig {
  key: string
  name: string
  icon: string
  color: string
  priority: PlatformPriority
  isEcommerce?: boolean
  category: string
  appSchemes?: string[]
}

export const PLATFORMS: PlatformConfig[] = [
  // S级 - 全球核心命脉（12个）
  { key: 'douyin', name: '抖音', icon: 'musical-notes', color: '#000000', priority: 'S', category: 'video', appSchemes: ['snssdk1128://', 'douyin://'] },
  { key: 'xiaohongshu', name: '小红书', icon: 'book', color: '#FF2442', priority: 'S', category: 'social', appSchemes: ['xhsdiscover://'] },
  { key: 'bilibili', name: '哔哩哔哩', icon: 'play-circle', color: '#00A1D6', priority: 'S', category: 'video', appSchemes: ['bilibili://'] },
  { key: 'wechat', name: '微信公众号', icon: 'chatbubble', color: '#07C160', priority: 'S', category: 'article', appSchemes: ['weixin://'] },
  { key: 'zhihu', name: '知乎', icon: 'help-circle', color: '#0066FF', priority: 'S', category: 'social', appSchemes: ['zhihu://'] },
  { key: 'weibo', name: '微博', icon: 'chatbubbles', color: '#E6162D', priority: 'S', category: 'social', appSchemes: ['sinaweibo://'] },
  { key: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', priority: 'S', category: 'video' },
  { key: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000', priority: 'S', category: 'video' },
  { key: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', priority: 'S', category: 'social' },
  { key: 'twitter', name: 'Twitter/X', icon: 'logo-twitter', color: '#1DA1F2', priority: 'S', category: 'social' },
  { key: 'reddit', name: 'Reddit', icon: 'logo-reddit', color: '#FF4500', priority: 'S', category: 'social' },
  { key: 'pinterest', name: 'Pinterest', icon: 'logo-pinterest', color: '#BD081C', priority: 'S', category: 'social' },

  // A级 - 区域高频（23个）
  { key: 'dianping', name: '大众点评', icon: 'restaurant', color: '#FF6633', priority: 'A', category: 'life', appSchemes: ['dianping://'] },
  { key: 'meituan', name: '美团', icon: 'storefront', color: '#FFD100', priority: 'A', category: 'life', appSchemes: ['imeituan://'] },
  { key: 'mafengwo', name: '马蜂窝', icon: 'location', color: '#FFA500', priority: 'A', category: 'life', appSchemes: ['mafengwo://'] },
  { key: 'ctrip', name: '携程', icon: 'airplane-outline', color: '#0A6EBD', priority: 'A', category: 'life' },
  { key: 'fliggy', name: '飞猪', icon: 'paper-plane-outline', color: '#FF6A00', priority: 'A', category: 'life' },
  { key: 'taobao', name: '淘宝', icon: 'cart', color: '#FF5000', priority: 'A', isEcommerce: true, category: 'ecommerce', appSchemes: ['taobao://'] },
  { key: 'jd', name: '京东', icon: 'cube', color: '#E4393C', priority: 'A', isEcommerce: true, category: 'ecommerce', appSchemes: ['openapp.jdmobile://'] },
  { key: 'douban', name: '豆瓣', icon: 'star', color: '#007722', priority: 'A', category: 'social', appSchemes: ['douban://'] },
  { key: 'toutiao', name: '今日头条', icon: 'newspaper', color: '#ED1C24', priority: 'A', category: 'article', appSchemes: ['snssdk141://'] },
  { key: 'netease-music', name: '网易云音乐', icon: 'musical-note', color: '#C20C0C', priority: 'A', category: 'music', appSchemes: ['orpheus://'] },
  { key: 'qq-music', name: 'QQ音乐', icon: 'headphones', color: '#31C27C', priority: 'A', category: 'music', appSchemes: ['qqmusic://'] },
  { key: 'tripadvisor', name: 'TripAdvisor', icon: 'compass-outline', color: '#34E0A1', priority: 'A', category: 'life' },
  { key: 'booking', name: 'Booking.com', icon: 'bed-outline', color: '#003580', priority: 'A', category: 'life' },
  { key: 'airbnb', name: 'Airbnb', icon: 'home-outline', color: '#FF5A5F', priority: 'A', category: 'life', appSchemes: ['airbnb://'] },
  { key: 'expedia', name: 'Expedia', icon: 'airplane-outline', color: '#0033A0', priority: 'A', category: 'life' },
  { key: 'amazon', name: 'Amazon', icon: 'cart-outline', color: '#FF9900', priority: 'A', isEcommerce: true, category: 'ecommerce' },
  { key: 'ebay', name: 'eBay', icon: 'cart-outline', color: '#E53238', priority: 'A', isEcommerce: true, category: 'ecommerce' },
  { key: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2', priority: 'A', category: 'social' },
  { key: 'discord', name: 'Discord', icon: 'logo-discord', color: '#5865F2', priority: 'A', category: 'social' },
  { key: 'medium', name: 'Medium', icon: 'newspaper-outline', color: '#00AB6C', priority: 'A', category: 'article' },
  { key: 'quora', name: 'Quora', icon: 'help-buoy-outline', color: '#B92B27', priority: 'A', category: 'qna' },
  { key: 'spotify', name: 'Spotify', icon: 'musical-notes-outline', color: '#1DB954', priority: 'A', category: 'music' },
  { key: 'apple-music', name: 'Apple Music', icon: 'musical-notes-outline', color: '#FC3C44', priority: 'A', category: 'music' },

  // B级 - 垂直头部（25个）
  { key: 'github', name: 'GitHub', icon: 'logo-github', color: '#24292F', priority: 'B', category: 'dev' },
  { key: 'stackoverflow', name: 'Stack Overflow', icon: 'code-slash-outline', color: '#BC4C00', priority: 'B', category: 'dev' },
  { key: 'csdn', name: 'CSDN', icon: 'code-working', color: '#FC5531', priority: 'B', category: 'dev' },
  { key: 'gitee', name: 'Gitee', icon: 'git-branch', color: '#C71D23', priority: 'B', category: 'dev' },
  { key: 'dribbble', name: 'Dribbble', icon: 'basketball-outline', color: '#EA4C89', priority: 'B', category: 'design' },
  { key: 'behance', name: 'Behance', icon: 'briefcase-outline', color: '#1769FF', priority: 'B', category: 'design' },
  { key: 'figma', name: 'Figma', icon: 'color-palette-outline', color: '#F24E1E', priority: 'B', category: 'design' },
  { key: 'notion', name: 'Notion', icon: 'documents-outline', color: '#000000', priority: 'B', category: 'efficiency' },
  { key: 'yuque', name: '语雀', icon: 'book-outline', color: '#25B0ED', priority: 'B', category: 'efficiency' },
  { key: 'google-workspace', name: 'Google Workspace', icon: 'logo-google', color: '#4285F4', priority: 'B', category: 'efficiency' },
  { key: 'dropbox', name: 'Dropbox', icon: 'cloud-upload-outline', color: '#0061FF', priority: 'B', category: 'efficiency' },
  { key: 'coursera', name: 'Coursera', icon: 'school', color: '#0056D2', priority: 'B', category: 'education' },
  { key: 'udemy', name: 'Udemy', icon: 'library-outline', color: '#A435D0', priority: 'B', category: 'education' },
  { key: 'edx', name: 'edX', icon: 'school-outline', color: '#021F4D', priority: 'B', category: 'education' },
  { key: 'imooc', name: '慕课网', icon: 'school-outline', color: '#F9503D', priority: 'B', category: 'education' },
  { key: 'khan-academy', name: 'Khan Academy', icon: 'school-outline', color: '#14BF96', priority: 'B', category: 'education' },
  { key: 'producthunt', name: 'Product Hunt', icon: 'trophy', color: '#DA552F', priority: 'B', category: 'tech' },
  { key: '36kr', name: '36氪', icon: 'rocket', color: '#0070FF', priority: 'B', category: 'tech' },
  { key: 'sspai', name: '少数派', icon: 'reader', color: '#DA2828', priority: 'B', category: 'tech' },
  { key: 'techcrunch', name: 'TechCrunch', icon: 'newspaper-outline', color: '#0A9B4E', priority: 'B', category: 'tech' },
  { key: 'steam', name: 'Steam', icon: 'desktop', color: '#171a21', priority: 'B', category: 'game' },
  { key: 'taptap', name: 'TapTap', icon: 'game-controller-outline', color: '#00DCC8', priority: 'B', category: 'game', appSchemes: ['taptap://'] },
  { key: 'twitch', name: 'Twitch', icon: 'logo-twitch', color: '#9146FF', priority: 'B', category: 'game' },
  { key: 'chatgpt', name: 'ChatGPT', icon: 'chatbubble-ellipses', color: '#10A37F', priority: 'B', category: 'ai' },
  { key: 'claude', name: 'Claude', icon: 'sparkles', color: '#D97706', priority: 'B', category: 'ai' },

  // C级 - 中低频垂直（31个）
  { key: 'kuaishou', name: '快手', icon: 'videocam', color: '#FF4906', priority: 'C', category: 'video', appSchemes: ['kwai://'] },
  { key: 'tencent-video', name: '腾讯视频', icon: 'tv', color: '#FF6A10', priority: 'C', category: 'video', appSchemes: ['tenvideo2://'] },
  { key: 'youku', name: '优酷', icon: 'play', color: '#1A91FF', priority: 'C', category: 'video', appSchemes: ['youku://'] },
  { key: 'iqiyi', name: '爱奇艺', icon: 'eye', color: '#00BE06', priority: 'C', category: 'video', appSchemes: ['iqiyi://'] },
  { key: 'tieba', name: '百度贴吧', icon: 'people', color: '#4E6EF2', priority: 'C', category: 'social', appSchemes: ['com.baidu.tieba://'] },
  { key: 'hupu', name: '虎扑', icon: 'basketball', color: '#D4213D', priority: 'C', category: 'social', appSchemes: ['hupu://'] },
  { key: 'xueqiu', name: '雪球', icon: 'trending-up', color: '#0076FF', priority: 'C', category: 'finance' },
  { key: 'eastmoney', name: '东方财富', icon: 'stats-chart', color: '#E4393C', priority: 'C', category: 'finance' },
  { key: 'dongchedi', name: '懂车帝', icon: 'car-sport-outline', color: '#FF5000', priority: 'C', category: 'auto' },
  { key: 'autohome', name: '汽车之家', icon: 'car-outline', color: '#E60012', priority: 'C', category: 'auto' },
  { key: 'bosszhipin', name: 'Boss直聘', icon: 'people-circle-outline', color: '#00BEAD', priority: 'C', category: 'hiring' },
  { key: 'anjuke', name: '安居客', icon: 'business-outline', color: '#00B96B', priority: 'C', category: 'life' },
  { key: 'ke', name: '贝壳找房', icon: 'home-outline', color: '#00B96B', priority: 'C', category: 'life' },
  { key: 'weread', name: '微信读书', icon: 'book-outline', color: '#07C160', priority: 'C', category: 'article' },
  { key: 'qidian', name: '起点', icon: 'book-outline', color: '#00A862', priority: 'C', category: 'article' },
  { key: 'pinduoduo', name: '拼多多', icon: 'gift', color: '#E02E24', priority: 'C', isEcommerce: true, category: 'ecommerce', appSchemes: ['pinduoduo://'] },
  { key: 'xianyu', name: '闲鱼', icon: 'repeat-outline', color: '#FF6A00', priority: 'C', isEcommerce: true, category: 'ecommerce' },
  { key: 'netflix', name: 'Netflix', icon: 'tv-outline', color: '#E50914', priority: 'C', category: 'video' },
  { key: 'disney-plus', name: 'Disney+', icon: 'tv-outline', color: '#113CCF', priority: 'C', category: 'video' },
  { key: 'hbo-max', name: 'HBO Max', icon: 'tv-outline', color: '#B535F6', priority: 'C', category: 'video' },
  { key: 'telegram', name: 'Telegram', icon: 'send', color: '#26A5E4', priority: 'C', category: 'social' },
  { key: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat', color: '#FFFC00', priority: 'C', category: 'social' },
  { key: 'slack', name: 'Slack', icon: 'chatbubbles-outline', color: '#4A154B', priority: 'C', category: 'efficiency' },
  { key: 'trello', name: 'Trello', icon: 'clipboard-outline', color: '#0079BF', priority: 'C', category: 'efficiency' },
  { key: 'onedrive', name: 'OneDrive', icon: 'cloud-upload-outline', color: '#094AB2', priority: 'C', category: 'efficiency' },
  { key: 'wise', name: 'Wise', icon: 'card-outline', color: '#009B77', priority: 'C', category: 'finance' },
  { key: 'robinhood', name: 'Robinhood', icon: 'trending-up-outline', color: '#00C805', priority: 'C', category: 'finance' },
  { key: 'glassdoor', name: 'Glassdoor', icon: 'briefcase-outline', color: '#0A6B35', priority: 'C', category: 'hiring' },
  { key: 'indeed', name: 'Indeed', icon: 'briefcase-outline', color: '#2164F3', priority: 'C', category: 'hiring' },
  { key: 'unsplash', name: 'Unsplash', icon: 'image-outline', color: '#111111', priority: 'C', category: 'photo' },
  { key: 'pexels', name: 'Pexels', icon: 'images-outline', color: '#05A081', priority: 'C', category: 'photo' },
]

// ===== 工具函数 =====

export function getPlatformConfig(key: string): PlatformConfig | undefined {
  return PLATFORMS.find(p => p.key === key)
}

export function getPlatformName(key: string): string {
  return getPlatformConfig(key)?.name || '其他'
}

export function getPlatformColor(key: string): string {
  return getPlatformConfig(key)?.color || '#999999'
}

export function getPlatformIcon(key: string): string {
  return getPlatformConfig(key)?.icon || 'globe-outline'
}

/** 按优先级获取平台列表 */
export function getPlatformsByPriority(priority: PlatformPriority): PlatformConfig[] {
  return PLATFORMS.filter(p => p.priority === priority)
}

/** 获取 S/A 级平台（用于前端快速推荐） */
export function getTopPlatforms(): PlatformConfig[] {
  return PLATFORMS.filter(p => p.priority === 'S' || p.priority === 'A')
}

/**
 * 构建 Deep Link URL（从 HTTP URL 转换为 APP Scheme URL）
 * 支持所有91个平台中已知 scheme 的平台
 */
export function buildDeepLink(url: string, platformKey: string): string | null {
  try {
    const urlObj = new URL(url)
    const host = urlObj.hostname
    const path = urlObj.pathname

    switch (platformKey) {
      case 'douyin': {
        const videoMatch = path.match(/\/video\/(\d+)/)
        if (videoMatch) return `snssdk1128://aweme/detail/${videoMatch[1]}`
        const noteMatch = path.match(/\/note\/(\d+)/)
        if (noteMatch) return `snssdk1128://aweme/detail/${noteMatch[1]}`
        if (host.includes('douyin.com') || host.includes('iesdouyin.com')) {
          return `snssdk1128://aweme/detail?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'bilibili': {
        const bvMatch = path.match(/\/video\/(BV[\w]+)/)
        if (bvMatch) return `bilibili://video/${bvMatch[1]}`
        if (host.includes('bilibili.com') || host.includes('b23.tv')) {
          return `bilibili://video?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'xiaohongshu': {
        const exploreMatch = path.match(/\/explore\/([\w]+)/)
        if (exploreMatch) return `xhsdiscover://item/${exploreMatch[1]}`
        if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) {
          return `xhsdiscover://item?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'kuaishou': {
        if (host.includes('kuaishou.com')) {
          return `kwai://short-video?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'weibo': {
        if (host.includes('weibo.com') || host.includes('weibo.cn')) {
          return `sinaweibo://detail?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'zhihu': {
        const zhuanlanMatch = path.match(/\/p\/(\d+)/)
        if (zhuanlanMatch) return `zhihu://answers/${zhuanlanMatch[1]}`
        if (host.includes('zhihu.com')) {
          return `zhihu://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'taobao': {
        return `taobao://${urlObj.pathname}${urlObj.search}`
      }
      case 'jd': {
        const jdMatch = urlObj.pathname.match(/\/(\d+)\.html/)
        if (jdMatch) {
          return `openapp.jdmobile://virtual?params=${encodeURIComponent(JSON.stringify({ category: 'jump', des: 'productDetail', skuId: jdMatch[1] }))}`
        }
        if (host.includes('jd.com')) {
          return `openapp.jdmobile://virtual?params=${encodeURIComponent(JSON.stringify({ category: 'jump', des: 'webview', url }))}`
        }
        break
      }
      case 'pinduoduo': {
        const goodsId = urlObj.searchParams.get('goods_id')
        if (goodsId) return `pinduoduo://com.xunmeng.pinduoduo/goods.html?goods_id=${goodsId}`
        if (host.includes('pinduoduo.com') || host.includes('yangkeduo.com')) {
          return `pinduoduo://com.xunmeng.pinduoduo/webview?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'netease-music': {
        const songId = urlObj.searchParams.get('id')
        if (songId && urlObj.pathname.includes('/song')) return `orpheus://song/${songId}`
        if (host.includes('music.163.com')) {
          return `orpheus://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'qq-music': {
        const songMatch = urlObj.pathname.match(/\/songDetail\/([\w]+)/)
        if (songMatch) return `qqmusic://song/${songMatch[1]}`
        if (host.includes('y.qq.com')) {
          return `qqmusic://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'tencent-video': {
        if (host.includes('v.qq.com')) {
          const coverMatch = urlObj.pathname.match(/\/cover\/[\w]+\/([\w]+)/)
          if (coverMatch) return `tenvideo2://?action=1&cover_id=${coverMatch[1]}`
          return `tenvideo2://?action=1&url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'youku': {
        if (host.includes('youku.com')) {
          const idMatch = urlObj.pathname.match(/\/id_([\w=]+)/)
          if (idMatch) return `youku://play?vid=${idMatch[1]}`
          return `youku://play?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'iqiyi': {
        if (host.includes('iqiyi.com')) {
          return `iqiyi://mobile/player?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'toutiao': {
        if (host.includes('toutiao.com')) {
          return `snssdk141://detail?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'tieba': {
        if (host.includes('tieba.baidu.com')) {
          const threadMatch = urlObj.pathname.match(/\/p\/(\d+)/)
          if (threadMatch) return `com.baidu.tieba://pb/thread?tid=${threadMatch[1]}`
          return `com.baidu.tieba://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'douban': {
        if (host.includes('douban.com')) {
          return `douban://douban.com/${urlObj.pathname}`
        }
        break
      }
      case 'hupu': {
        if (host.includes('hupu.com')) {
          return `hupu://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'dianping': {
        if (host.includes('dianping.com')) {
          return `dianping://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'meituan': {
        if (host.includes('meituan.com')) {
          return `imeituan://www.meituan.com/web?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'mafengwo': {
        if (host.includes('mafengwo.cn')) {
          return `mafengwo://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'xueqiu': {
        if (host.includes('xueqiu.com')) {
          const snMatch = urlObj.pathname.match(/\/sn\/(\d+)/)
          if (snMatch) return `xueqiu://sn/${snMatch[1]}`
          return `xueqiu://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'youtube': {
        if (host.includes('youtube.com') || host.includes('youtu.be')) {
          const videoIdMatch = path.match(/\/watch\?.*v=([\w-]+)/) || urlObj.searchParams.get('v')
          if (videoIdMatch) {
            return `youtube://video?id=${typeof videoIdMatch === 'string' ? videoIdMatch : videoIdMatch[1]}`
          }
          if (host.includes('youtu.be')) {
            return `youtube://video?id=${path.replace('/', '')}`
          }
        }
        break
      }
      case 'tiktok': {
        if (host.includes('tiktok.com')) {
          return `tiktok://home?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'twitter': {
        if (host.includes('twitter.com') || host.includes('x.com')) {
          return `twitter://post?message=${encodeURIComponent(url)}`
        }
        break
      }
      case 'instagram': {
        if (host.includes('instagram.com')) {
          return `instagram://media?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'reddit': {
        if (host.includes('reddit.com')) {
          return `reddit://${urlObj.pathname}`
        }
        break
      }
      case 'spotify': {
        if (host.includes('spotify.com')) {
          return `spotify:${urlObj.pathname}${urlObj.search}`
        }
        break
      }
      case 'telegram': {
        if (host.includes('t.me')) {
          return `tg://resolve?domain=${path.replace('/', '')}`
        }
        break
      }
      case 'discord': {
        if (host.includes('discord.gg')) {
          return `discord://invite/${path.replace('/invite/', '')}`
        } else if (host.includes('discord.com')) {
          return `discord://channel?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'linkedin': {
        if (host.includes('linkedin.com')) {
          return `linkedin://${urlObj.pathname}`
        }
        break
      }
      case 'twitch': {
        if (host.includes('twitch.tv')) {
          return `twitch://stream/${path.replace('/', '')}`
        }
        break
      }
      case 'steam': {
        if (host.includes('steampowered.com')) {
          const appMatch = urlObj.searchParams.get('app') || path.match(/\/app\/(\d+)/)?.[1]
          if (appMatch) {
            return `steam://store/${appMatch}`
          }
          return `steam://openurl/${encodeURIComponent(url)}`
        }
        break
      }
      case 'taptap': {
        if (host.includes('taptap.cn') || host.includes('taptap.io')) {
          return `taptap://taptap.com${urlObj.pathname}`
        }
        break
      }
      case 'notion': {
        if (host.includes('notion.so') || host.includes('notion.site')) {
          return `notion://${urlObj.host}${urlObj.pathname}`
        }
        break
      }
      case 'quora': {
        if (host.includes('quora.com')) {
          return `quora://quora.onelink.me/q/home?target_url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'pinterest': {
        if (host.includes('pinterest.com')) {
          return `pinterest://${urlObj.pathname}`
        }
        break
      }
      case 'dongchedi': {
        if (host.includes('dongchedi.com')) {
          return `dongchedi://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'autohome': {
        if (host.includes('autohome.com')) {
          return `autohome://url?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'yuque': {
        if (host.includes('yuque.com')) {
          return `yuque://doc?url=${encodeURIComponent(url)}`
        }
        break
      }
      case 'imooc': {
        if (host.includes('imooc.com')) {
          return `imooc://course${urlObj.pathname}`
        }
        break
      }
      case 'coursera': {
        if (host.includes('coursera.org')) {
          return `coursera://course${urlObj.pathname}`
        }
        break
      }
      case 'udemy': {
        if (host.includes('udemy.com')) {
          return `udemy://course${urlObj.pathname}`
        }
        break
      }
      default:
        break
    }

    return null
  } catch {
    return null
  }
}

// ===== 增强版默认封面（React Native 组件用） =====
import { getCategoryStyle, getFirstChar, hashToColor } from './coverTemplates';

export interface GradientCoverStyle {
  from: string;
  to: string;
  icon: string;
  initial: string;
  platformName: string;
  title?: string;
}

/**
 * 获取默认封面样式（供 React Native 组件渲染）
 * 不生成 SVG data URI，而是返回配色数据供 GradientCover 组件直接使用
 * @param platformKey 平台key
 * @param title 可选标题（用于首字）
 * @param url 可选链接（用于哈希配色）
 */
export function getDefaultCoverStyle(platformKey: string, title?: string, url?: string): GradientCoverStyle {
  const platform = getPlatformConfig(platformKey);

  if (!platform) {
    const colors = hashToColor(url || platformKey);
    return {
      from: colors.from,
      to: colors.to,
      icon: 'globe-outline',
      initial: getFirstChar(title) || '?',
      platformName: 'Other',
      title,
    };
  }

  const style = getCategoryStyle(platform.category);

  // 如果平台色太浅，用品类暗色渐变
  const hex = platform.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  let from: string, to: string;
  if (luminance > 0.6) {
    const hashColors = hashToColor(url || platformKey);
    from = hashColors.from;
    to = hashColors.to;
  } else {
    const darken = (c: number) => Math.max(0, Math.floor(c * 0.45));
    from = `rgb(${darken(r)},${darken(g)},${darken(b)})`;
    to = `rgb(${Math.floor(darken(r) * 0.6)},${Math.floor(darken(g) * 0.6)},${Math.floor(darken(b) * 0.6)})`;
  }

  return {
    from,
    to,
    icon: style.icon,
    initial: getFirstChar(title || platform.name),
    platformName: platform.name,
    title,
  };
}
