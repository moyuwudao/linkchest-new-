export interface PlatformSample {
  key: string
  name: string
  priority: 'S' | 'A' | 'B' | 'C'
  category: string
  sampleUrls: string[]
  notes?: string
}

export const PLATFORM_SAMPLES: PlatformSample[] = [
  // ========== S级（12个）==========
  { key: 'douyin', name: '抖音', priority: 'S', category: 'video', sampleUrls: ['https://www.douyin.com/video/7312345678901234567', 'https://www.douyin.com/'], notes: 'SPA，SSR OG标签' },
  { key: 'xiaohongshu', name: '小红书', priority: 'S', category: 'social', sampleUrls: ['https://www.xiaohongshu.com/explore/66a1ebc1000000001e01c8e1'], notes: 'SPA，专属API' },
  { key: 'bilibili', name: '哔哩哔哩', priority: 'S', category: 'video', sampleUrls: ['https://www.bilibili.com/video/BV1GJ411x7h7'], notes: 'oEmbed+公开API' },
  { key: 'wechat', name: '微信公众号', priority: 'S', category: 'article', sampleUrls: ['https://mp.weixin.qq.com/s?__biz=MzA4MjQxNjQzMA==&mid=2649917420'], notes: 'OG标签规范' },
  { key: 'zhihu', name: '知乎', priority: 'S', category: 'social', sampleUrls: ['https://zhuanlan.zhihu.com/p/681356101'], notes: '文章公开API' },
  { key: 'weibo', name: '微博', priority: 'S', category: 'social', sampleUrls: ['https://weibo.com/1892653244/ODfFN8Z2t', 'https://weibo.com/'], notes: 'SPA，Worker降级' },
  { key: 'youtube', name: 'YouTube', priority: 'S', category: 'video', sampleUrls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'], notes: '标准oEmbed' },
  { key: 'tiktok', name: 'TikTok', priority: 'S', category: 'video', sampleUrls: ['https://www.tiktok.com/@charlidamelio/video/6801589203014472966'], notes: '标准oEmbed' },
  { key: 'instagram', name: 'Instagram', priority: 'S', category: 'social', sampleUrls: ['https://www.instagram.com/instagram/'], notes: 'oEmbed需token' },
  { key: 'twitter', name: 'Twitter/X', priority: 'S', category: 'social', sampleUrls: ['https://twitter.com/elonmusk/status/1684985061763604481'], notes: '标准oEmbed' },
  { key: 'reddit', name: 'Reddit', priority: 'S', category: 'social', sampleUrls: ['https://www.reddit.com/r/technology/'], notes: 'SSR OG标签' },
  { key: 'pinterest', name: 'Pinterest', priority: 'S', category: 'social', sampleUrls: ['https://www.pinterest.com/ideas/'], notes: 'OG标签规范' },

  // ========== A级（23个）==========
  { key: 'dianping', name: '大众点评', priority: 'A', category: 'life', sampleUrls: ['https://www.dianping.com/'], notes: 'Worker降级' },
  { key: 'meituan', name: '美团', priority: 'A', category: 'life', sampleUrls: ['https://www.meituan.com/'], notes: 'OG标签一般' },
  { key: 'mafengwo', name: '马蜂窝', priority: 'A', category: 'life', sampleUrls: ['https://www.mafengwo.cn/i/23546076.html'], notes: 'OG标签规范' },
  { key: 'ctrip', name: '携程', priority: 'A', category: 'life', sampleUrls: ['https://you.ctrip.com/travels/yunnan100007/4824763.html'], notes: 'OG标签规范' },
  { key: 'fliggy', name: '飞猪', priority: 'A', category: 'life', sampleUrls: ['https://www.fliggy.com/'], notes: 'OG标签一般' },
  { key: 'taobao', name: '淘宝', priority: 'A', category: 'ecommerce', sampleUrls: ['https://www.taobao.com/'], notes: '需登录' },
  { key: 'jd', name: '京东', priority: 'A', category: 'ecommerce', sampleUrls: ['https://item.jd.com/100012043978.html'], notes: 'OG标签一般' },
  { key: 'douban', name: '豆瓣', priority: 'A', category: 'social', sampleUrls: ['https://movie.douban.com/subject/1292052/'], notes: 'OG标签规范' },
  { key: 'toutiao', name: '今日头条', priority: 'A', category: 'article', sampleUrls: ['https://www.toutiao.com/'], notes: 'Worker降级' },
  { key: 'netease-music', name: '网易云音乐', priority: 'A', category: 'music', sampleUrls: ['https://music.163.com/song?id=186016', 'https://music.163.com/playlist?id=3778678'], notes: 'OG标签规范' },
  { key: 'qq-music', name: 'QQ音乐', priority: 'A', category: 'music', sampleUrls: ['https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV'], notes: 'OG标签规范' },
  { key: 'tripadvisor', name: 'TripAdvisor', priority: 'A', category: 'life', sampleUrls: ['https://www.tripadvisor.com/Attraction_Review-g294212-d324889-Reviews.html'], notes: 'OG标签规范' },
  { key: 'booking', name: 'Booking.com', priority: 'A', category: 'life', sampleUrls: ['https://www.booking.com/'], notes: 'OG标签规范' },
  { key: 'airbnb', name: 'Airbnb', priority: 'A', category: 'life', sampleUrls: ['https://www.airbnb.com/'], notes: 'OG标签规范' },
  { key: 'expedia', name: 'Expedia', priority: 'A', category: 'life', sampleUrls: ['https://www.expedia.com/'], notes: 'OG标签规范' },
  { key: 'amazon', name: 'Amazon', priority: 'A', category: 'ecommerce', sampleUrls: ['https://www.amazon.com/dp/B08N5WRWNW'], notes: 'OG标签一般' },
  { key: 'ebay', name: 'eBay', priority: 'A', category: 'ecommerce', sampleUrls: ['https://www.ebay.com/'], notes: 'OG标签一般' },
  { key: 'linkedin', name: 'LinkedIn', priority: 'A', category: 'social', sampleUrls: ['https://www.linkedin.com/'], notes: '文章页OG规范' },
  { key: 'discord', name: 'Discord', priority: 'A', category: 'social', sampleUrls: ['https://discord.com/'], notes: '需登录' },
  { key: 'medium', name: 'Medium', priority: 'A', category: 'article', sampleUrls: ['https://medium.com/@mr_james_corden/the-ultimate-guide-to-react-2024'], notes: 'OG标签规范' },
  { key: 'quora', name: 'Quora', priority: 'A', category: 'qna', sampleUrls: ['https://www.quora.com/What-are-the-best-ways-to-learn-programming'], notes: 'OG标签规范' },
  { key: 'spotify', name: 'Spotify', priority: 'A', category: 'music', sampleUrls: ['https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'], notes: '标准oEmbed' },
  { key: 'apple-music', name: 'Apple Music', priority: 'A', category: 'music', sampleUrls: ['https://music.apple.com/us/album/1989-taylors-version/1713845538'], notes: 'OG标签规范' },

  // ========== B级（25个）==========
  { key: 'github', name: 'GitHub', priority: 'B', category: 'dev', sampleUrls: ['https://github.com/facebook/react'], notes: 'OG标签规范' },
  { key: 'stackoverflow', name: 'Stack Overflow', priority: 'B', category: 'dev', sampleUrls: ['https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster'], notes: 'OG标签规范' },
  { key: 'csdn', name: 'CSDN', priority: 'B', category: 'dev', sampleUrls: ['https://blog.csdn.net/weixin_43883917/article/details/128728451'], notes: 'OG标签一般' },
  { key: 'gitee', name: 'Gitee', priority: 'B', category: 'dev', sampleUrls: ['https://gitee.com/mirrors/react'], notes: 'OG标签规范' },
  { key: 'dribbble', name: 'Dribbble', priority: 'B', category: 'design', sampleUrls: ['https://dribbble.com/'], notes: 'OG标签规范' },
  { key: 'behance', name: 'Behance', priority: 'B', category: 'design', sampleUrls: ['https://www.behance.net/'], notes: 'OG标签规范' },
  { key: 'figma', name: 'Figma', priority: 'B', category: 'design', sampleUrls: ['https://www.figma.com/community'], notes: 'OG标签规范' },
  { key: 'notion', name: 'Notion', priority: 'B', category: 'efficiency', sampleUrls: ['https://www.notion.so/'], notes: 'OG标签规范' },
  { key: 'yuque', name: '语雀', priority: 'B', category: 'efficiency', sampleUrls: ['https://www.yuque.com/'], notes: 'OG标签规范' },
  { key: 'google-workspace', name: 'Google Workspace', priority: 'B', category: 'efficiency', sampleUrls: ['https://workspace.google.com/'], notes: '需权限' },
  { key: 'dropbox', name: 'Dropbox', priority: 'B', category: 'efficiency', sampleUrls: ['https://www.dropbox.com/'], notes: 'OG标签规范' },
  { key: 'coursera', name: 'Coursera', priority: 'B', category: 'education', sampleUrls: ['https://www.coursera.org/learn/machine-learning'], notes: 'OG标签规范' },
  { key: 'udemy', name: 'Udemy', priority: 'B', category: 'education', sampleUrls: ['https://www.udemy.com/course/the-complete-web-development-bootcamp/'], notes: 'OG标签规范' },
  { key: 'edx', name: 'edX', priority: 'B', category: 'education', sampleUrls: ['https://www.edx.org/learn/computer-science/harvard-university-cs50'], notes: 'OG标签规范' },
  { key: 'imooc', name: '慕课网', priority: 'B', category: 'education', sampleUrls: ['https://www.imooc.com/'], notes: 'OG标签一般' },
  { key: 'khan-academy', name: 'Khan Academy', priority: 'B', category: 'education', sampleUrls: ['https://www.khanacademy.org/math/algebra'], notes: 'OG标签规范' },
  { key: 'producthunt', name: 'Product Hunt', priority: 'B', category: 'tech', sampleUrls: ['https://www.producthunt.com/'], notes: 'OG标签规范' },
  { key: '36kr', name: '36氪', priority: 'B', category: 'tech', sampleUrls: ['https://36kr.com/'], notes: '专属提取+Worker' },
  { key: 'sspai', name: '少数派', priority: 'B', category: 'tech', sampleUrls: ['https://sspai.com/post/80609'], notes: 'OG标签规范' },
  { key: 'techcrunch', name: 'TechCrunch', priority: 'B', category: 'tech', sampleUrls: ['https://techcrunch.com/'], notes: 'OG标签规范' },
  { key: 'steam', name: 'Steam', priority: 'B', category: 'game', sampleUrls: ['https://store.steampowered.com/app/730/CounterStrike_2/'], notes: 'OG标签规范' },
  { key: 'taptap', name: 'TapTap', priority: 'B', category: 'game', sampleUrls: ['https://www.taptap.cn/'], notes: 'OG标签规范' },
  { key: 'twitch', name: 'Twitch', priority: 'B', category: 'game', sampleUrls: ['https://www.twitch.tv/shroud'], notes: 'oEmbed+Worker' },
  { key: 'chatgpt', name: 'ChatGPT', priority: 'B', category: 'ai', sampleUrls: ['https://chatgpt.com/'], notes: 'OG标签有限' },
  { key: 'claude', name: 'Claude', priority: 'B', category: 'ai', sampleUrls: ['https://claude.ai/'], notes: 'OG标签有限' },

  // ========== C级（31个）==========
  { key: 'kuaishou', name: '快手', priority: 'C', category: 'video', sampleUrls: ['https://www.kuaishou.com/'], notes: 'SPA专属提取' },
  { key: 'tencent-video', name: '腾讯视频', priority: 'C', category: 'video', sampleUrls: ['https://v.qq.com/'], notes: 'SPA专属提取' },
  { key: 'youku', name: '优酷', priority: 'C', category: 'video', sampleUrls: ['https://www.youku.com/'], notes: 'SPA专属提取' },
  { key: 'iqiyi', name: '爱奇艺', priority: 'C', category: 'video', sampleUrls: ['https://www.iqiyi.com/'], notes: 'SPA专属提取' },
  { key: 'tieba', name: '百度贴吧', priority: 'C', category: 'social', sampleUrls: ['https://tieba.baidu.com/'], notes: 'OG标签一般' },
  { key: 'hupu', name: '虎扑', priority: 'C', category: 'social', sampleUrls: ['https://www.hupu.com/'], notes: 'OG标签一般' },
  { key: 'xueqiu', name: '雪球', priority: 'C', category: 'finance', sampleUrls: ['https://xueqiu.com/'], notes: 'Worker降级' },
  { key: 'eastmoney', name: '东方财富', priority: 'C', category: 'finance', sampleUrls: ['https://www.eastmoney.com/'], notes: 'OG标签一般' },
  { key: 'dongchedi', name: '懂车帝', priority: 'C', category: 'auto', sampleUrls: ['https://www.dongchedi.com/'], notes: 'OG标签一般' },
  { key: 'autohome', name: '汽车之家', priority: 'C', category: 'auto', sampleUrls: ['https://www.autohome.com.cn/'], notes: 'OG标签一般' },
  { key: 'bosszhipin', name: 'Boss直聘', priority: 'C', category: 'hiring', sampleUrls: ['https://www.zhipin.com/'], notes: '需登录' },
  { key: 'anjuke', name: '安居客', priority: 'C', category: 'life', sampleUrls: ['https://www.anjuke.com/'], notes: 'OG标签一般' },
  { key: 'ke', name: '贝壳找房', priority: 'C', category: 'life', sampleUrls: ['https://www.ke.com/'], notes: 'OG标签一般' },
  { key: 'weread', name: '微信读书', priority: 'C', category: 'article', sampleUrls: ['https://weread.qq.com/'], notes: 'OG标签一般' },
  { key: 'qidian', name: '起点', priority: 'C', category: 'article', sampleUrls: ['https://www.qidian.com/'], notes: 'OG标签一般' },
  { key: 'pinduoduo', name: '拼多多', priority: 'C', category: 'ecommerce', sampleUrls: ['https://www.pinduoduo.com/'], notes: '需登录' },
  { key: 'xianyu', name: '闲鱼', priority: 'C', category: 'ecommerce', sampleUrls: ['https://www.xianyu.taobao.com/'], notes: '需登录' },
  { key: 'netflix', name: 'Netflix', priority: 'C', category: 'video', sampleUrls: ['https://www.netflix.com/'], notes: '需登录' },
  { key: 'disney-plus', name: 'Disney+', priority: 'C', category: 'video', sampleUrls: ['https://www.disneyplus.com/'], notes: '需登录' },
  { key: 'hbo-max', name: 'HBO Max', priority: 'C', category: 'video', sampleUrls: ['https://www.max.com/'], notes: '需登录' },
  { key: 'telegram', name: 'Telegram', priority: 'C', category: 'social', sampleUrls: ['https://t.me/durov'], notes: 'OG标签有限' },
  { key: 'snapchat', name: 'Snapchat', priority: 'C', category: 'social', sampleUrls: ['https://www.snapchat.com/'], notes: 'OG标签有限' },
  { key: 'slack', name: 'Slack', priority: 'C', category: 'efficiency', sampleUrls: ['https://slack.com/blog'], notes: 'OG标签规范' },
  { key: 'trello', name: 'Trello', priority: 'C', category: 'efficiency', sampleUrls: ['https://trello.com/'], notes: 'OG标签规范' },
  { key: 'onedrive', name: 'OneDrive', priority: 'C', category: 'efficiency', sampleUrls: ['https://www.onedrive.com/'], notes: 'OG标签一般' },
  { key: 'wise', name: 'Wise', priority: 'C', category: 'finance', sampleUrls: ['https://wise.com/us/blog'], notes: 'OG标签规范' },
  { key: 'robinhood', name: 'Robinhood', priority: 'C', category: 'finance', sampleUrls: ['https://robinhood.com/us/en/'], notes: 'OG标签一般' },
  { key: 'glassdoor', name: 'Glassdoor', priority: 'C', category: 'hiring', sampleUrls: ['https://www.glassdoor.com/'], notes: 'OG标签规范' },
  { key: 'indeed', name: 'Indeed', priority: 'C', category: 'hiring', sampleUrls: ['https://www.indeed.com/'], notes: 'OG标签规范' },
  { key: 'unsplash', name: 'Unsplash', priority: 'C', category: 'photo', sampleUrls: ['https://unsplash.com/'], notes: 'OG标签规范' },
  { key: 'pexels', name: 'Pexels', priority: 'C', category: 'photo', sampleUrls: ['https://www.pexels.com/'], notes: 'OG标签规范' },
]

export function getSamplesByPriority(priority: 'S' | 'A' | 'B' | 'C'): PlatformSample[] {
  return PLATFORM_SAMPLES.filter(p => p.priority === priority)
}

export function getSampleByKey(key: string): PlatformSample | undefined {
  return PLATFORM_SAMPLES.find(p => p.key === key)
}
