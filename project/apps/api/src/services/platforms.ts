// 支持的平台配置 - 精简至 91 个平台，按 S/A/B/C 优先级分级
// S级：全球核心命脉（不做就别做产品）
// A级：区域高频（对应市场用户的高频场景）
// B级：垂直头部（特定人群，各市场都有明确价值）
// C级：中低频垂直（特定人群，保留但不做重点优化）

export type PlatformPriority = 'S' | 'A' | 'B' | 'C'

export interface PlatformConfig {
  key: string           // 平台标识
  name: string          // 中文名称
  domains: string[]     // 匹配域名
  color: string         // 品牌主色
  category: string      // 平台分类
  priority: PlatformPriority // 平台优先级 (S/A/B/C)
  isEcommerce?: boolean // 是否为电商平台
  appSchemes?: string[] // APP URL Scheme，用于 Deep Link
  defaultCover?: string // 默认占位图
  gradientDirection?: 'to-right' | 'to-bottom' | 'to-br' | 'to-tr'
  gradientOpacity?: number
}

/**
 * 品类枚举：
 * video | social | article | music | ecommerce | life |
 * knowledge | finance | dev | game | design | ai |
 * efficiency | hiring | auto | photo | tech | qna | education
 */

/**
 * 生成平台默认占位图（SVG data URI）
 * 基于品牌色+平台名首字生成渐变占位图，支持渐变方向与透明度
 */
export function generateDefaultCover(
  platform: PlatformConfig,
  options?: { gradientDirection?: 'to-right' | 'to-bottom' | 'to-br' | 'to-tr'; opacity?: number }
): string {
  const bg = platform.color
  const text = platform.name[0] || '?'
  const hex = bg.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // 生成次要渐变色（调亮 30%）
  const sr = Math.min(255, Math.round(r * 1.3))
  const sg = Math.min(255, Math.round(g * 1.3))
  const sb = Math.min(255, Math.round(b * 1.3))
  const secondaryColor = `#${sr.toString(16).padStart(2, '0')}${sg.toString(16).padStart(2, '0')}${sb.toString(16).padStart(2, '0')}`

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.55 ? '#1f2937' : '#ffffff'

  const direction = options?.gradientDirection || platform.gradientDirection || 'to-br'
  const opacity = options?.opacity ?? platform.gradientOpacity ?? 1

  const dirMap: Record<string, string> = {
    'to-right': 'x1="0%" y1="0%" x2="100%" y2="0%"',
    'to-bottom': 'x1="0%" y1="0%" x2="0%" y2="100%"',
    'to-br': 'x1="0%" y1="0%" x2="100%" y2="100%"',
    'to-tr': 'x1="0%" y1="100%" x2="100%" y2="0%"',
  }
  const gradientAttrs = dirMap[direction] || dirMap['to-br']

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="g" ${gradientAttrs}>
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g)" rx="8" opacity="${opacity}"/>
  <text x="200" y="160" font-family="system-ui,sans-serif" font-size="72" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
  <text x="200" y="220" font-family="system-ui,sans-serif" font-size="20" fill="${textColor}" text-anchor="middle" opacity="0.7">${platform.name}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  // ================================================================
  //  S级 - 全球核心命脉（12个）
  // ================================================================
  // 国内核心
  {
    key: 'douyin',
    name: '抖音',
    domains: ['douyin.com', 'iesdouyin.com', 'v.douyin.com'],
    color: '#000000',
    category: 'video',
    priority: 'S',
    appSchemes: ['snssdk1128://', 'douyin://'],
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    domains: ['xiaohongshu.com', 'xhslink.com'],
    color: '#FF2442',
    category: 'social',
    priority: 'S',
    appSchemes: ['xhsdiscover://'],
  },
  {
    key: 'bilibili',
    name: '哔哩哔哩',
    domains: ['bilibili.com', 'b23.tv'],
    color: '#00A1D6',
    category: 'video',
    priority: 'S',
    appSchemes: ['bilibili://'],
  },
  {
    key: 'wechat',
    name: '微信公众号',
    domains: ['mp.weixin.qq.com'],
    color: '#07C160',
    category: 'article',
    priority: 'S',
    appSchemes: ['weixin://'],
  },
  {
    key: 'zhihu',
    name: '知乎',
    domains: ['zhihu.com', 'zhuanlan.zhihu.com'],
    color: '#0066FF',
    category: 'social',
    priority: 'S',
    appSchemes: ['zhihu://'],
  },
  {
    key: 'weibo',
    name: '微博',
    domains: ['weibo.com', 'm.weibo.cn'],
    color: '#E6162D',
    category: 'social',
    priority: 'S',
    appSchemes: ['sinaweibo://'],
  },
  // 国际核心
  {
    key: 'youtube',
    name: 'YouTube',
    domains: ['youtube.com', 'youtu.be', 'm.youtube.com'],
    color: '#FF0000',
    category: 'video',
    priority: 'S',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    domains: ['tiktok.com'],
    color: '#000000',
    category: 'video',
    priority: 'S',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    domains: ['instagram.com', 'instagr.am'],
    color: '#E4405F',
    category: 'social',
    priority: 'S',
  },
  {
    key: 'twitter',
    name: 'Twitter/X',
    domains: ['twitter.com', 'x.com', 't.co'],
    color: '#1DA1F2',
    category: 'social',
    priority: 'S',
  },
  {
    key: 'reddit',
    name: 'Reddit',
    domains: ['reddit.com', 'redd.it'],
    color: '#FF4500',
    category: 'social',
    priority: 'S',
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    domains: ['pinterest.com', 'pin.it'],
    color: '#BD081C',
    category: 'social',
    priority: 'S',
  },

  // ================================================================
  //  A级 - 区域高频（23个）
  // ================================================================
  // 国内生活/电商/资讯
  {
    key: 'dianping',
    name: '大众点评',
    domains: ['dianping.com', 'm.dianping.com'],
    color: '#FF6633',
    category: 'life',
    priority: 'A',
    appSchemes: ['dianping://'],
  },
  {
    key: 'meituan',
    name: '美团',
    domains: ['meituan.com', 'm.meituan.com'],
    color: '#FFD100',
    category: 'life',
    priority: 'A',
    appSchemes: ['imeituan://'],
  },
  {
    key: 'mafengwo',
    name: '马蜂窝',
    domains: ['mafengwo.cn'],
    color: '#FFA500',
    category: 'life',
    priority: 'A',
    appSchemes: ['mafengwo://'],
  },
  {
    key: 'ctrip',
    name: '携程',
    domains: ['ctrip.com', 'www.ctrip.com'],
    color: '#0A6EBD',
    category: 'life',
    priority: 'A',
    appSchemes: ['ctrip://'],
  },
  {
    key: 'fliggy',
    name: '飞猪',
    domains: ['fliggy.com', 'www.fliggy.com'],
    color: '#FF6A00',
    category: 'life',
    priority: 'A',
  },
  {
    key: 'taobao',
    name: '淘宝',
    domains: ['taobao.com', 'tmall.com', 'm.tb.cn'],
    color: '#FF5000',
    category: 'ecommerce',
    priority: 'A',
    isEcommerce: true,
    appSchemes: ['taobao://'],
  },
  {
    key: 'jd',
    name: '京东',
    domains: ['jd.com', 'm.jd.com'],
    color: '#E4393C',
    category: 'ecommerce',
    priority: 'A',
    isEcommerce: true,
    appSchemes: ['openapp.jdmobile://'],
  },
  {
    key: 'douban',
    name: '豆瓣',
    domains: ['douban.com', 'm.douban.com'],
    color: '#007722',
    category: 'social',
    priority: 'A',
    appSchemes: ['douban://'],
  },
  {
    key: 'toutiao',
    name: '今日头条',
    domains: ['toutiao.com', 'm.toutiao.com'],
    color: '#ED1C24',
    category: 'article',
    priority: 'A',
    appSchemes: ['snssdk141://'],
  },
  {
    key: 'netease-music',
    name: '网易云音乐',
    domains: ['music.163.com', 'y.music.163.com'],
    color: '#C20C0C',
    category: 'music',
    priority: 'A',
    appSchemes: ['orpheus://'],
  },
  {
    key: 'qq-music',
    name: 'QQ音乐',
    domains: ['y.qq.com'],
    color: '#31C27C',
    category: 'music',
    priority: 'A',
    appSchemes: ['qqmusic://'],
  },
  // 国际生活/电商/资讯
  {
    key: 'tripadvisor',
    name: 'TripAdvisor',
    domains: ['tripadvisor.com', 'tripadvisor.co.uk'],
    color: '#34E0A1',
    category: 'life',
    priority: 'A',
  },
  {
    key: 'booking',
    name: 'Booking.com',
    domains: ['booking.com', 'booking.com.au'],
    color: '#003580',
    category: 'life',
    priority: 'A',
  },
  {
    key: 'airbnb',
    name: 'Airbnb',
    domains: ['airbnb.com', 'www.airbnb.com'],
    color: '#FF5A5F',
    category: 'life',
    priority: 'A',
    appSchemes: ['airbnb://'],
  },
  {
    key: 'expedia',
    name: 'Expedia',
    domains: ['expedia.com', 'expedia.co.uk'],
    color: '#0033A0',
    category: 'life',
    priority: 'A',
  },
  {
    key: 'amazon',
    name: 'Amazon',
    domains: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.co.jp'],
    color: '#FF9900',
    category: 'ecommerce',
    priority: 'A',
    isEcommerce: true,
  },
  {
    key: 'ebay',
    name: 'eBay',
    domains: ['ebay.com', 'ebay.co.uk', 'ebay.de'],
    color: '#E53238',
    category: 'ecommerce',
    priority: 'A',
    isEcommerce: true,
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    domains: ['linkedin.com', 'lnkd.in'],
    color: '#0A66C2',
    category: 'social',
    priority: 'A',
  },
  {
    key: 'discord',
    name: 'Discord',
    domains: ['discord.com', 'discord.gg'],
    color: '#5865F2',
    category: 'social',
    priority: 'A',
  },
  {
    key: 'medium',
    name: 'Medium',
    domains: ['medium.com', 'medium.org'],
    color: '#00AB6C',
    category: 'article',
    priority: 'A',
  },
  {
    key: 'quora',
    name: 'Quora',
    domains: ['quora.com'],
    color: '#B92B27',
    category: 'qna',
    priority: 'A',
  },
  {
    key: 'spotify',
    name: 'Spotify',
    domains: ['spotify.com', 'open.spotify.com'],
    color: '#1DB954',
    category: 'music',
    priority: 'A',
  },
  {
    key: 'apple-music',
    name: 'Apple Music',
    domains: ['music.apple.com', 'itunes.apple.com'],
    color: '#FC3C44',
    category: 'music',
    priority: 'A',
  },

  // ================================================================
  //  B级 - 垂直头部（26个）
  // ================================================================
  // 开发者
  {
    key: 'github',
    name: 'GitHub',
    domains: ['github.com'],
    color: '#24292F',
    category: 'dev',
    priority: 'B',
  },
  {
    key: 'stackoverflow',
    name: 'Stack Overflow',
    domains: ['stackoverflow.com', 'stackexchange.com'],
    color: '#BC4C00',
    category: 'dev',
    priority: 'B',
  },
  {
    key: 'csdn',
    name: 'CSDN',
    domains: ['csdn.net', 'blog.csdn.net'],
    color: '#FC5531',
    category: 'dev',
    priority: 'B',
  },
  {
    key: 'gitee',
    name: 'Gitee',
    domains: ['gitee.com'],
    color: '#C71D23',
    category: 'dev',
    priority: 'B',
  },
  // 设计
  {
    key: 'dribbble',
    name: 'Dribbble',
    domains: ['dribbble.com', 'drbbl.in'],
    color: '#EA4C89',
    category: 'design',
    priority: 'B',
  },
  {
    key: 'behance',
    name: 'Behance',
    domains: ['behance.net', 'behance.com'],
    color: '#1769FF',
    category: 'design',
    priority: 'B',
  },
  {
    key: 'figma',
    name: 'Figma',
    domains: ['figma.com', 'figma.design'],
    color: '#F24E1E',
    category: 'design',
    priority: 'B',
  },
  // 效率工具
  {
    key: 'notion',
    name: 'Notion',
    domains: ['notion.so', 'notion.site'],
    color: '#000000',
    category: 'efficiency',
    priority: 'B',
  },
  {
    key: 'yuque',
    name: '语雀',
    domains: ['yuque.com', 'www.yuque.com'],
    color: '#25B0ED',
    category: 'efficiency',
    priority: 'B',
  },
  {
    key: 'google-workspace',
    name: 'Google Workspace',
    domains: ['workspace.google.com'],
    color: '#4285F4',
    category: 'efficiency',
    priority: 'B',
  },
  {
    key: 'dropbox',
    name: 'Dropbox',
    domains: ['dropbox.com', 'dropboxusercontent.com'],
    color: '#0061FF',
    category: 'efficiency',
    priority: 'B',
  },
  // 在线学习
  {
    key: 'coursera',
    name: 'Coursera',
    domains: ['coursera.org'],
    color: '#0056D2',
    category: 'education',
    priority: 'B',
  },
  {
    key: 'udemy',
    name: 'Udemy',
    domains: ['udemy.com'],
    color: '#A435D0',
    category: 'education',
    priority: 'B',
  },
  {
    key: 'edx',
    name: 'edX',
    domains: ['edx.org', 'edx.com'],
    color: '#021F4D',
    category: 'education',
    priority: 'B',
  },
  {
    key: 'imooc',
    name: '慕课网',
    domains: ['imooc.com'],
    color: '#F9503D',
    category: 'education',
    priority: 'B',
  },
  {
    key: 'khan-academy',
    name: 'Khan Academy',
    domains: ['khanacademy.org'],
    color: '#14BF96',
    category: 'education',
    priority: 'B',
  },
  // 科技资讯
  {
    key: 'producthunt',
    name: 'Product Hunt',
    domains: ['producthunt.com'],
    color: '#DA552F',
    category: 'tech',
    priority: 'B',
  },
  {
    key: '36kr',
    name: '36氪',
    domains: ['36kr.com'],
    color: '#0070FF',
    category: 'tech',
    priority: 'B',
  },
  {
    key: 'sspai',
    name: '少数派',
    domains: ['sspai.com'],
    color: '#DA2828',
    category: 'tech',
    priority: 'B',
  },
  {
    key: 'techcrunch',
    name: 'TechCrunch',
    domains: ['techcrunch.com', 'techcrunch.io'],
    color: '#0A9B4E',
    category: 'tech',
    priority: 'B',
  },
  // 游戏
  {
    key: 'steam',
    name: 'Steam',
    domains: ['steampowered.com', 'store.steampowered.com'],
    color: '#171a21',
    category: 'game',
    priority: 'B',
  },
  {
    key: 'taptap',
    name: 'TapTap',
    domains: ['taptap.cn', 'taptap.io'],
    color: '#00DCC8',
    category: 'game',
    priority: 'B',
  },
  {
    key: 'twitch',
    name: 'Twitch',
    domains: ['twitch.tv', 'clips.twitch.tv'],
    color: '#9146FF',
    category: 'game',
    priority: 'B',
  },
  // AI
  {
    key: 'chatgpt',
    name: 'ChatGPT',
    domains: ['chatgpt.com', 'chat.openai.com'],
    color: '#10A37F',
    category: 'ai',
    priority: 'B',
  },
  {
    key: 'claude',
    name: 'Claude',
    domains: ['claude.ai', 'anthropic.com'],
    color: '#D97706',
    category: 'ai',
    priority: 'B',
  },

  // ================================================================
  //  C级 - 中低频垂直（30个）
  // ================================================================
  // 国内视频
  {
    key: 'kuaishou',
    name: '快手',
    domains: ['kuaishou.com', 'gifshow.com', 'v.kuaishou.com'],
    color: '#FF4906',
    category: 'video',
    priority: 'C',
    appSchemes: ['kwai://'],
  },
  {
    key: 'tencent-video',
    name: '腾讯视频',
    domains: ['v.qq.com'],
    color: '#FF6A10',
    category: 'video',
    priority: 'C',
    appSchemes: ['tenvideo2://'],
  },
  {
    key: 'youku',
    name: '优酷',
    domains: ['youku.com', 'v.youku.com'],
    color: '#1A91FF',
    category: 'video',
    priority: 'C',
    appSchemes: ['youku://'],
  },
  {
    key: 'iqiyi',
    name: '爱奇艺',
    domains: ['iqiyi.com', 'm.iqiyi.com'],
    color: '#00BE06',
    category: 'video',
    priority: 'C',
    appSchemes: ['iqiyi://'],
  },
  // 国内社区
  {
    key: 'tieba',
    name: '百度贴吧',
    domains: ['tieba.baidu.com'],
    color: '#4E6EF2',
    category: 'social',
    priority: 'C',
    appSchemes: ['com.baidu.tieba://'],
  },
  {
    key: 'hupu',
    name: '虎扑',
    domains: ['hupu.com', 'm.hupu.com'],
    color: '#D4213D',
    category: 'social',
    priority: 'C',
    appSchemes: ['hupu://'],
  },
  // 国内财经
  {
    key: 'xueqiu',
    name: '雪球',
    domains: ['xueqiu.com'],
    color: '#0076FF',
    category: 'finance',
    priority: 'C',
  },
  {
    key: 'eastmoney',
    name: '东方财富',
    domains: ['eastmoney.com'],
    color: '#E4393C',
    category: 'finance',
    priority: 'C',
  },
  // 国内汽车
  {
    key: 'dongchedi',
    name: '懂车帝',
    domains: ['dongchedi.com'],
    color: '#FF5000',
    category: 'auto',
    priority: 'C',
  },
  {
    key: 'autohome',
    name: '汽车之家',
    domains: ['autohome.com.cn', 'autohome.com'],
    color: '#E60012',
    category: 'auto',
    priority: 'C',
  },
  // 国内招聘
  {
    key: 'bosszhipin',
    name: 'Boss直聘',
    domains: ['zhipin.com', 'bosszhipin.com'],
    color: '#00BEAD',
    category: 'hiring',
    priority: 'C',
  },
  // 国内房产
  {
    key: 'anjuke',
    name: '安居客',
    domains: ['anjuke.com', 'www.anjuke.com'],
    color: '#00B96B',
    category: 'life',
    priority: 'C',
  },
  {
    key: 'ke',
    name: '贝壳找房',
    domains: ['ke.com', 'www.ke.com'],
    color: '#00B96B',
    category: 'life',
    priority: 'C',
  },
  // 国内阅读
  {
    key: 'weread',
    name: '微信读书',
    domains: ['weread.qq.com', 'weread.com'],
    color: '#07C160',
    category: 'article',
    priority: 'C',
    appSchemes: ['weread://'],
  },
  {
    key: 'qidian',
    name: '起点',
    domains: ['qidian.com', 'www.qidian.com'],
    color: '#00A862',
    category: 'article',
    priority: 'C',
  },
  // 国内电商
  {
    key: 'pinduoduo',
    name: '拼多多',
    domains: ['pinduoduo.com', 'yangkeduo.com'],
    color: '#E02E24',
    category: 'ecommerce',
    priority: 'C',
    isEcommerce: true,
    appSchemes: ['pinduoduo://'],
  },
  {
    key: 'xianyu',
    name: '闲鱼',
    domains: ['xianyu.taobao.com', '2.taobao.com'],
    color: '#FF6A00',
    category: 'ecommerce',
    priority: 'C',
    isEcommerce: true,
    appSchemes: ['xianyu://'],
  },
  // 国际视频
  {
    key: 'netflix',
    name: 'Netflix',
    domains: ['netflix.com', 'www.netflix.com'],
    color: '#E50914',
    category: 'video',
    priority: 'C',
  },
  {
    key: 'disney-plus',
    name: 'Disney+',
    domains: ['disneyplus.com', 'disney-plus.net'],
    color: '#113CCF',
    category: 'video',
    priority: 'C',
  },
  {
    key: 'hbo-max',
    name: 'HBO Max',
    domains: ['hbomax.com', 'max.com'],
    color: '#B535F6',
    category: 'video',
    priority: 'C',
  },
  // 国际社交
  {
    key: 'telegram',
    name: 'Telegram',
    domains: ['telegram.org', 't.me'],
    color: '#26A5E4',
    category: 'social',
    priority: 'C',
  },
  {
    key: 'snapchat',
    name: 'Snapchat',
    domains: ['snapchat.com', 'web.snapchat.com'],
    color: '#FFFC00',
    category: 'social',
    priority: 'C',
  },
  // 国际效率
  {
    key: 'slack',
    name: 'Slack',
    domains: ['slack.com', 'slackhq.com'],
    color: '#4A154B',
    category: 'efficiency',
    priority: 'C',
  },
  {
    key: 'trello',
    name: 'Trello',
    domains: ['trello.com', 'trello.blue'],
    color: '#0079BF',
    category: 'efficiency',
    priority: 'C',
  },
  {
    key: 'onedrive',
    name: 'OneDrive',
    domains: ['onedrive.com', '1drv.ms'],
    color: '#094AB2',
    category: 'efficiency',
    priority: 'C',
  },
  // 国际财经
  {
    key: 'wise',
    name: 'Wise',
    domains: ['wise.com', 'transferwise.com'],
    color: '#009B77',
    category: 'finance',
    priority: 'C',
  },
  {
    key: 'robinhood',
    name: 'Robinhood',
    domains: ['robinhood.com', 'robinhood.app'],
    color: '#00C805',
    category: 'finance',
    priority: 'C',
  },
  // 国际招聘
  {
    key: 'glassdoor',
    name: 'Glassdoor',
    domains: ['glassdoor.com', 'glassdoor.co.uk'],
    color: '#0A6B35',
    category: 'hiring',
    priority: 'C',
  },
  {
    key: 'indeed',
    name: 'Indeed',
    domains: ['indeed.com', 'indeed.co.uk'],
    color: '#2164F3',
    category: 'hiring',
    priority: 'C',
  },
  // 国际图片
  {
    key: 'unsplash',
    name: 'Unsplash',
    domains: ['unsplash.com', 'unsplash.photos'],
    color: '#111111',
    category: 'photo',
    priority: 'C',
  },
  {
    key: 'pexels',
    name: 'Pexels',
    domains: ['pexels.com', 'pexels.io'],
    color: '#05A081',
    category: 'photo',
    priority: 'C',
  },
]

// ================================================================
//  工具函数
// ================================================================

/**
 * 根据URL识别平台 — 使用 hostname 精确匹配（避免 includes 误匹配）
 */
export function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const platform of SUPPORTED_PLATFORMS) {
      for (const domain of platform.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return platform.key
        }
      }
    }
  } catch {
    // URL 解析失败，静默降级
  }
  return 'other'
}

/** 获取平台配置 */
export function getPlatformConfig(key: string): PlatformConfig | undefined {
  return SUPPORTED_PLATFORMS.find(p => p.key === key)
}

/** 获取支持平台（供前端展示） */
export function getSupportedPlatformList() {
  return SUPPORTED_PLATFORMS.map(p => ({
    key: p.key,
    name: p.name,
    domains: p.domains,
    color: p.color,
    category: p.category,
    priority: p.priority,
    isEcommerce: p.isEcommerce || false,
    appSchemes: p.appSchemes || [],
    defaultCover: p.defaultCover || generateDefaultCover(p),
  }))
}

/** 按优先级获取平台列表 */
export function getPlatformsByPriority(priority: PlatformPriority) {
  return SUPPORTED_PLATFORMS.filter(p => p.priority === priority)
}

/** 获取 S/A 级平台（用于前端快速推荐） */
export function getTopPlatforms() {
  return SUPPORTED_PLATFORMS.filter(p => p.priority === 'S' || p.priority === 'A')
}
