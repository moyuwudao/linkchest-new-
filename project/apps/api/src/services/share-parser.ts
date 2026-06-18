/**
 * 分享文本智能解析服务
 * 从手机APP分享文案中提取URL、还原短链、提取标题、识别平台
 */
import fetch from 'node-fetch'
import https from 'https'
import * as cheerio from 'cheerio'
import { detectPlatform } from './platforms'

// HTTPS Agent: 允许自签名证书（部分海外站点证书不受信任）
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

// ========== 类型定义 ==========

export interface ParseResult {
  /** 提取/还原后的最终URL */
  url: string
  /** 原始提取的URL（短链），如果与最终URL不同则有值 */
  originalUrl?: string
  /** 从分享文本中提取的标题 */
  textTitle?: string
  /** 识别的平台 */
  platform: string
  /** 解析步骤详情（用于调试） */
  steps: ParseStep[]
}

export interface ParseStep {
  step: string
  status: 'success' | 'failed' | 'skipped'
  detail?: string
  result?: string
}

// ========== 短链域名配置（V3.2 扩充） ==========

const SHORT_LINK_DOMAINS = [
  // 国内视频/直播
  'v.douyin.com',      // 抖音
  'live.douyin.com',   // 抖音直播
  'b23.tv',            // B站（新增）
  'm.bilibili.com',    // B站移动端
  'v.kuaishou.com',    // 快手
  'v.qq.com',          // 腾讯视频短链
  'm.tb.cn',           // 淘宝
  '3.cn',              // 京东短链（新增）
  't.cn',              // 微博
  'weibo.cn',          // 微博移动端
  'dwz.cn',            // 百度
  'url.cn',            // 腾讯
  'u.jd.com',          // 京东
  'p.pinduoduo.com',   // 拼多多
  'mobile.yangkeduo.com', // 拼多多移动端
  'oem.toutiao.com',   // 今日头条
  // 国内工具/社交
  'weixin://',         // 微信（URL Scheme）
  'xhslink.com',       // 小红书短链
  'music.163.com',     // 网易云音乐
  'xima.xiami.com',    // 虾米音乐（已停服但有存量）
  // 海外视频/社交
  'vm.tiktok.com',     // TikTok
  'vt.tiktok.com',     // TikTok
  'tiktok.com',        // TikTok 主站短链
  'youtu.be',          // YouTube 短链
  'fb.com',            // Facebook
  'l.facebook.com',   // Facebook 重定向
  'lnkd.in',           // LinkedIn 短链
  'pin.it',           // Pinterest 短链
  'redd.it',          // Reddit 短链
  'instagram.com',    // Instagram
  'instagr.am',       // Instagram 短链
  't.me',             // Telegram
  'bit.ly',           // 通用短链
  'tinyurl.com',      // 通用短链
  't.co',             // Twitter/X
  'goo.gl',           // Google 短链（已停服但仍有存量）
  'amzn.to',          // Amazon 短链
  'a.co',             // Amazon 短链
  'ow.ly',            // Hootsuite 短链
  'buff.ly',          // Buffer 短链
  'lnk.to',           // 通用短链
  'soo.link',         // 通用短链
  'sourl.cn',         // 缩链
  'mulu.cn',          // 木鲁短链
  'shorturl.at',      // 通用短链
]

// 跟踪参数（URL标准化时移除，V3.2 扩充）
const TRACKING_PARAMS = [
  // 通用 Analytics
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_source', 'utm_source', // 重复确保匹配
  // 通用追踪
  'from', 'sharefrom', 'share_token', 'share_id', 'source', 'is_from_webapp',
  'mid', 'aid', 'author_id', 'scene', 'type', 'channel',
  'sp_atk', 'sp_bid', 'sp_cid',
  'spm', 'scm',   // 淘宝/天猫追踪
  'ref', 'referrer', 'refer', 'referer',
  'ns', 'mrd',    // 小红书追踪
  'enterfrom', 'enterFrom', // 抖音
  'enterMethod',
  'groupId', 'itemId', // 快手
  'f', 's',      // 通用追踪
  'app', 'platform', 'os',
  'sign', 'ts', 'timestamp',
  'tracelog', 'tracklog',
  'cstm', 'custom',
  // V3.2 新增追踪参数
  'alginfo',    // 优酷/土豆追踪
  'seqId',      // 优酷序列追踪
  'abId',       // A/B测试
  'sceneId',    // 场景追踪
  'reqId',      // 请求追踪
  's',          // 短哈希追踪
  'vfm',        // 视频格式追踪
  'fv',         // 视频追踪
  'wid',       // 头条追踪
  'page', 'pageId', 'page_id',
  'share', 'shareId', 'share_id',
  'account', 'accountId',
  'user', 'userId', 'user_id', 'uid',
  'trace', 'tracelog', 'track_id',
  'campaign', 'campaign_id',
  'ad', 'adid', 'ad_id', 'ads',
  'click', 'clickId', 'click_id',
  'keyword', 'keywords', 'search_key',
  'q', 'query', 'search_query',
  // UUID格式追踪参数
  'uuid', 'sid', 'session_id', 'sessionid',
  'cid', 'client_id', 'clientId',
  // 时间戳追踪参数
  '_t', 't', 'time', 'timeStamp', 'timestamp_ms',
  'nocache', 'rand', 'r',
]

// ========== 平台模板正则（用于清理分享文案中的模板文字，V3.2 大幅扩充） ==========

const PLATFORM_TEMPLATE_PATTERNS = [
  // ========== 抖音 ==========
  /[\d.]+\s*复制打开抖音[，,]?\s*/g,
  /复制打开抖音[，,]?\s*/g,
  /复知打开抖音[，,]?\s*/g,
  /打开抖音看看[，,]?\s*/g,
  /抖音[：:]?\s*/g,
  /打开抖音\s*直接观看/g,
  /查看置顶评论[\s\S]*?抖音/g,
  /在抖音记录美好生活/g,

  // ========== 小红书 ==========
  /复制打开小红书[，,]?\s*/g,
  /打开小红书App[，,]?\s*/g,
  /打开小红书[，,]?\s*/g,
  /小红书[：:]?\s*/g,
  /小红书App[，,]?\s*/g,
  /打开小红书[\s]*直接观看/g,
  /查看置顶评论[\s\S]*?小红书/g,
  /查看更多精彩内容[\s\S]*?小红书/g,

  // ========== 快手（V3.2 重点扩充） ==========
  /复制这条信息[，,]?\s*/g,
  /打开快手[，,]?\s*/g,
  /快手[：:]?\s*/g,
  /快手App[，,]?\s*/g,
  /该作品在快手被播放过[\d.]+万次[，,]?点击链接[，,]?打开【快手】直接观看！?/g,
  /该作品在快手被播放过[\d.]+万次，点击链接，打开【快手】直接观看！?/g,
  /在快手看到这段内容，快来一起看/g,
  /快手，记录真实生活/g,
  /打开【快手】直接观看/g,

  // ========== 淘宝 ==========
  /复制打开淘宝[，,]?\s*/g,
  /打开淘宝[，,]?\s*/g,
  /淘宝[：:]?\s*/g,
  /打开淘宝App[，,]?\s*/g,
  /淘口令[\s\S]*?打开淘宝/g,
  /[\s]*(?:₳|₤|¢|฿|€|£|\$|₵|₮|₱|₦|₲|₡|₢|₣|₤|₧|₯|₰|₱|₳)[\w]+(?:₳|₤|¢|฿|€|£|\$|₵|₮|₱|₦|₲|₡|₢|₣|₤|₧|₯|₰|₱|₳)[\s]*/g, // 淘口令

  // ========== 京东 ==========
  /复制打开京东[，,]?\s*/g,
  /打开京东[，,]?\s*/g,
  /京东[：:]?\s*/g,
  /打开京东App[，,]?\s*/g,
  /(?:\$|￥)[\w]+(?:\$|￥)/g, // 京口令

  // ========== 拼多多 ==========
  /复制口令[，,]?\s*/g,
  /打开拼多多[，,]?\s*/g,
  /拼多多[：:]?\s*/g,
  /拼多多App[，,]?\s*/g,
  /复制本段口令[，,]?\s*/g,

  // ========== B站 ==========
  /复制打开B站[，,]?\s*/g,
  /打开B站[，,]?\s*/g,
  /bilibili[：:]?\s*/g,
  /哔哩哔哩[：:]?\s*/g,
  /B站[：:]?\s*/g,
  /【bilibili】/g,

  // ========== 优酷/腾讯/爱奇艺 ==========
  /复制打开优酷[，,]?\s*/g,
  /打开优酷[，,]?\s*/g,
  /优酷[：:]?\s*/g,
  /复制打开腾讯视频[，,]?\s*/g,
  /打开腾讯视频[，,]?\s*/g,
  /腾讯视频[：:]?\s*/g,
  /复制打开爱奇艺[，,]?\s*/g,
  /打开爱奇艺[，,]?\s*/g,
  /爱奇艺[：:]?\s*/g,

  // ========== 微信/公众号 ==========
  /复制打开微信[，,]?\s*/g,
  /打开微信[，,]?\s*/g,
  /微信[：:]?\s*/g,
  /公众号[：:]?\s*/g,
  /微信公众平台/g,

  // ========== 知乎 ==========
  /复制打开知乎[，,]?\s*/g,
  /打开知乎[，,]?\s*/g,
  /知乎[：:]?\s*/g,
  /知乎，圆环的答案/g,

  // ========== 微博 ==========
  /复制打开微博[，,]?\s*/g,
  /打开微博[，,]?\s*/g,
  /微博[：:]?\s*/g,
  /分享微博[，,]?\s*/g,
  /微博，随时随地发现新鲜事/g,

  // ========== 今日头条 ==========
  /复制打开头条[，,]?\s*/g,
  /打开头条[，,]?\s*/g,
  /今日头条[：:]?\s*/g,
  /头条[：:]?\s*/g,

  // ========== 网易云音乐 ==========
  /复制打开网易云音乐[，,]?\s*/g,
  /打开网易云音乐[，,]?\s*/g,
  /网易云音乐[：:]?\s*/g,
  /云音乐[：:]?\s*/g,

  // ========== 通用模板（放在最后作为兜底） ==========
  /复制打开[\s\S]*?[，,]/g,
  /【[\s\S]*?】/g,
  /点击链接[\s\S]*?[，,]/g,
  /长按复制[\s\S]*?[，,]/g,
  /分享[^\n]*?[到给][^\n]*?[，,]/g,
  /打开APP[，,]?\s*/g,
  /查看更多[，,]?\s*/g,
  /了解更多[，,]?\s*/g,
  /直接点击链接[，,]?\s*/g,
  /点击链接打开[，,]?\s*/g,
  /链接:[^\n]+/g,
  /视频地址:[^\n]+/g,
  /播放地址:[^\n]+/g,
]

// ========== URL提取 ==========

// 主URL正则：匹配http/https开头的链接
const URL_REGEX = /https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\uff08\uff09\uff1a\uff1b\uff0c\uff0e\uff1f]+|www\.[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\uff08\uff09\uff1a\uff1b\uff0c\uff0e\uff1f]+/gi

// 备用域名正则：不带http前缀的常见域名
const DOMAIN_REGEX = /[a-z0-9-]+\.(com|cn|net|org|io|cc|tv|fm|me|app|dev|top|vip|shop)[\/\?][^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]*/gi

/**
 * 从混合文本中提取URL
 */
export function extractUrlFromText(text: string): { url: string; steps: ParseStep[] } {
  const steps: ParseStep[] = []

  // 1. 尝试主正则提取
  let urls: string[] = text.match(URL_REGEX) || []

  if (urls.length > 0) {
    steps.push({ step: '提取URL', status: 'success', detail: '从文本中提取到标准URL', result: urls[0] })
  } else {
    // 2. 尝试备用域名正则
    const domainMatches = text.match(DOMAIN_REGEX) || []
    urls = domainMatches.map((d: string) => d.startsWith('http') ? d : `https://${d}`)

    if (urls.length > 0) {
      steps.push({ step: '提取URL', status: 'success', detail: '从文本中提取到裸域名', result: urls[0] })
    } else {
      steps.push({ step: '提取URL', status: 'failed', detail: '未在文本中找到有效链接' })
      return { url: '', steps }
    }
  }

  // 3. 清理尾部特殊字符
  const firstUrl = urls[0] || ''
  let cleanUrl = firstUrl.replace(/[)\]}>.,;:!?'"，。；：！？、」』】〕》"'…—～~]+$/, '')

  return { url: cleanUrl, steps }
}

// ========== 短链还原 ==========

/**
 * 判断URL是否为短链
 */
export function isShortLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return SHORT_LINK_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

/**
 * 还原短链为真实URL
 * 策略：先HEAD请求跟随重定向，失败则GET请求跟随重定向，再失败则解析HTML中的location.href
 */
export async function resolveShortLink(shortUrl: string): Promise<{ resolvedUrl: string; steps: ParseStep[] }> {
  const steps: ParseStep[] = []

  if (!isShortLink(shortUrl)) {
    steps.push({ step: '短链还原', status: 'skipped', detail: '非短链域名，无需还原' })
    return { resolvedUrl: shortUrl, steps }
  }

  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

  // 策略1：HEAD请求跟随重定向
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
      agent: shortUrl.startsWith('https') ? httpsAgent : undefined,
    })
    if (response.url && response.url !== shortUrl) {
      steps.push({ step: '短链还原', status: 'success', detail: 'HEAD请求跟随重定向成功', result: response.url })
      return { resolvedUrl: response.url, steps }
    }
  } catch {
    // HEAD失败，继续尝试GET
  }

  // 策略2：GET请求跟随重定向
  try {
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
      agent: shortUrl.startsWith('https') ? httpsAgent : undefined,
    })
    if (response.url && response.url !== shortUrl) {
      steps.push({ step: '短链还原', status: 'success', detail: 'GET请求跟随重定向成功', result: response.url })
      return { resolvedUrl: response.url, steps }
    }

    // 策略3：解析HTML中的JavaScript跳转（如淘宝m.tb.cn）
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      const html = await response.text()
      const resolvedFromHtml = extractRedirectUrl(html, shortUrl)
      if (resolvedFromHtml && resolvedFromHtml !== shortUrl) {
        steps.push({ step: '短链还原', status: 'success', detail: '从HTML中解析到跳转URL', result: resolvedFromHtml })
        return { resolvedUrl: resolvedFromHtml, steps }
      }
    }
  } catch {
    // GET也失败
  }

  steps.push({ step: '短链还原', status: 'failed', detail: '短链还原失败，使用原始URL' })
  return { resolvedUrl: shortUrl, steps }
}

/**
 * 从HTML中提取跳转URL（V3.2 增强版）
 * 支持：meta refresh、多种JS跳转模式、下载链接提取、平台专属正则
 */
function extractRedirectUrl(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html)

  // 1. meta refresh: <meta http-equiv="refresh" content="0;url=xxx">
  const metaRefresh = $('meta[http-equiv="refresh"]').attr('content')
  if (metaRefresh) {
    const urlMatch = metaRefresh.match(/url=(.+)/i)
    if (urlMatch) {
      return resolveRelativeUrl(baseUrl, urlMatch[1].trim().replace(/['"]/, ''))
    }
  }

  // 2. JavaScript location.href / window.location / location.replace（增强版）
  const jsPatterns = [
    // 标准跳转
    /location\.href\s*=\s*['"]([^'"]+)['"]/,
    /window\.location\s*=\s*['"]([^'"]+)['"]/,
    /location\.replace\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    /window\.location\.href\s*=\s*['"]([^'"]+)['"]/,
    // 增强跳转（V3.2 新增）
    /top\.location\.href\s*=\s*['"]([^'"]+)['"]/,
    /top\.location\s*=\s*['"]([^'"]+)['"]/,
    /document\.location\.href\s*=\s*['"]([^'"]+)['"]/,
    /document\.location\s*=\s*['"]([^'"]+)['"]/,
    /self\.location\.href\s*=\s*['"]([^'"]+)['"]/,
    /parent\.location\.href\s*=\s*['"]([^'"]+)['"]/,
    /window\.location\.assign\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    /window\.location\.replace\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    /location\.assign\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    // 异步跳转（延迟执行）
    /setTimeout\s*\(\s*['"]?\s*location[^\n]+['"]?\s*,\s*\d+\s*\)/gi,
    /setTimeout\s*\(\s*function\s*\(\)\s*\{[^}]*location[^\n]+[^}]*\}/gi,
  ]
  for (const pattern of jsPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const url = match[1].trim()
      if (url && !url.startsWith('javascript:')) {
        return resolveRelativeUrl(baseUrl, url)
      }
    }
  }

  // 3. data属性中的URL（V3.2 新增）
  const dataUrlSelectors = [
    '[data-url]', '[data-href]', '[data-link]', '[data-redirect]',
    '[data-target]', '[data-src]', '[data-urls]',
  ]
  for (const selector of dataUrlSelectors) {
    const dataUrl = $(selector).attr(selector.replace(/\[|\]/g, ''))
    if (dataUrl && dataUrl.startsWith('http')) {
      return dataUrl
    }
  }

  // 4. 下载/跳转按钮链接（V3.2 新增）
  const downloadLinkSelectors = [
    'a.download-btn', 'a.download-link', 'a[download]',
    'a.open-app-btn', 'a.jump-btn', 'a.redirect-btn',
    '.download-btn[href]', '.jump-link[href]', '#downloadLink', '#jumpLink',
  ]
  for (const selector of downloadLinkSelectors) {
    const link = $(selector).attr('href')
    if (link && link.startsWith('http') && !link.includes('javascript:')) {
      return resolveRelativeUrl(baseUrl, link)
    }
  }

  // 5. 快手专属跳转正则（V3.2 新增）
  const kuaishouPatterns = [
    /"realUrl"\s*:\s*"([^"]+)"/,
    /"uri"\s*:\s*"([^"]+)"/,
    /"playUrl"\s*:\s*"([^"]+)"/,
    /kwai:\/\/([^\s"'<>]+)/g,
  ]
  for (const pattern of kuaishouPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const url = match[1].trim()
      if (url.startsWith('http')) {
        return url
      }
    }
  }

  // 6. 抖音/头条专属跳转正则（V3.2 新增）
  const douyinPatterns = [
    /"play_addr"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/,
    /"video_url"\s*:\s*"([^"]+)"/,
    /aweme\/([^\s"'<>]+)/gi,
  ]
  for (const pattern of douyinPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const url = match[1].trim()
      if (url.startsWith('http')) {
        return url
      }
    }
  }

  // 7. 小红书专属跳转正则（V3.2 新增）
  const xiaohongshuPatterns = [
    /"xhs_link"\s*:\s*"([^"]+)"/,
    /"noteLink"\s*:\s*"([^"]+)"/,
    /detail~\/([^\s"'<>]+)/g,
  ]
  for (const pattern of xiaohongshuPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const url = match[1].trim()
      if (url.startsWith('http')) {
        return url
      }
    }
  }

  // 8. 从script标签中提取JSON数据中的URL（V3.2 新增）
  const scriptPatterns = [
    /window\.__INITIAL_STATE__\s*=\s*\{[^}]*"videoUrl"\s*:\s*"([^"]+)"/i,
    /window\.__INITIAL_STATE__\s*=\s*\{[^}]*"playUrl"\s*:\s*"([^"]+)"/i,
    /window\.__SSR_RENDER_DATA__\s*=\s*\{[^}]*"playUrl"\s*:\s*"([^"]+)"/i,
  ]
  for (const pattern of scriptPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return resolveRelativeUrl(baseUrl, match[1])
    }
  }

  return null
}

/**
 * 将相对URL转为绝对URL
 */
function resolveRelativeUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

// ========== 标题提取 ==========

/**
 * 从分享文本中提取标题
 * 去除URL、模板文字，提取有意义的文本作为标题
 */
export function extractTitleFromText(text: string, extractedUrl: string): { title: string; steps: ParseStep[] } {
  const steps: ParseStep[] = []

  // 1. 去除URL部分
  let title = text.replace(URL_REGEX, '').trim()

  // 2. 如果提取了URL，也尝试去除（可能URL格式略有差异）
  if (extractedUrl) {
    title = title.replace(extractedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), '').trim()
  }

  // 3. 应用平台模板正则清理
  for (const pattern of PLATFORM_TEMPLATE_PATTERNS) {
    title = title.replace(pattern, '').trim()
  }

  // 4. 清理前导数字/标点（如"2.84 "、"7.12 "等版本号格式）
  title = title.replace(/^[\s\d.:/\\\-]+/, '').trim()

  // 5. 清理尾部残留标点
  title = title.replace(/[\s,，。；：！？、…—～~]+$/, '').trim()

  // 6. 截断过长标题
  if (title.length > 100) {
    title = title.substring(0, 100)
  }

  if (title) {
    steps.push({ step: '提取标题', status: 'success', detail: '从分享文本中提取标题', result: title })
  } else {
    steps.push({ step: '提取标题', status: 'failed', detail: '未能从分享文本中提取有效标题' })
  }

  return { title, steps }
}

// ========== 输入类型判断 ==========

/**
 * 判断输入是标准URL还是混合文本（分享文案）
 */
export function isShareText(input: string): boolean {
  const trimmed = input.trim()

  // 纯URL：以http://或https://开头且不含中文
  if (/^https?:\/\/[^\s\u4e00-\u9fff]+$/i.test(trimmed)) {
    return false
  }

  // 包含中文或空格，视为分享文本
  if (/[\u4e00-\u9fff]/.test(trimmed) || /\s/.test(trimmed.trim())) {
    return true
  }

  // 以www开头且无空格，视为标准URL
  if (/^www\.[^\s]+$/i.test(trimmed)) {
    return false
  }

  // 默认视为分享文本
  return trimmed.includes(' ') || trimmed.length > 200
}

// ========== URL标准化 ==========

/**
 * 移除URL中的跟踪参数，补全协议（V3.2 增强版）
 * 支持：静态追踪参数、动态UUID参数、时间戳参数、短哈希参数
 */
function normalizeUrl(urlStr: string): string {
  try {
    // 补全协议
    let normalized = urlStr
    if (normalized.startsWith('www.')) {
      normalized = `https://${normalized}`
    }

    const urlObj = new URL(normalized)

    // 移除跟踪参数（V3.2 增强）
    const paramsToRemove: string[] = []
    const currentTime = Date.now()
    const oneYearMs = 365 * 24 * 60 * 60 * 1000

    urlObj.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase()

      // 1. 精确匹配的静态追踪参数
      if (TRACKING_PARAMS.includes(lowerKey)) {
        paramsToRemove.push(key)
        return
      }

      // 2. 动态参数清理（V3.2 新增）
      // 2.1 UUID格式（32位十六进制或带横线的UUID）
      if (/^[0-9a-f]{32}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        paramsToRemove.push(key)
        return
      }

      // 2.2 时间戳参数（值为10位或13位数字，且接近当前时间或过去1年内）
      if (/^\d{10,13}$/.test(value)) {
        const ts = parseInt(value, 10)
        const tsMs = value.length === 10 ? ts * 1000 : ts
        if (tsMs > 0 && tsMs < currentTime + oneYearMs) {
          paramsToRemove.push(key)
          return
        }
      }

      // 2.3 短哈希参数（8-32位字母数字混合，且无明显语义）
      // V3.5 fix: 'v' is YouTube/Bilibili video ID, must be preserved
      if (lowerKey === 'v') return
      if (/^[a-z0-9]{8,32}$/i.test(value) && !isSemanticWord(value)) {
        paramsToRemove.push(key)
        return
      }

      // 2.4 base64编码的追踪参数（常见于Facebook/Google Analytics）
      if (/^[A-Za-z0-9+/=]{20,}$/.test(value)) {
        try {
          const decoded = atob(value)
          if (decoded.includes('utm_') || decoded.includes('fbclid') || decoded.includes('gclid')) {
            paramsToRemove.push(key)
            return
          }
        } catch {
          // 不是有效的base64
        }
      }
    })

    paramsToRemove.forEach(key => urlObj.searchParams.delete(key))

    // 移除空的查询字符串
    const result = urlObj.toString()
    return result.endsWith('?') ? result.slice(0, -1) : result
  } catch {
    return urlStr
  }
}

/**
 * 判断字符串是否是有语义的词（非随机哈希）
 */
function isSemanticWord(str: string): boolean {
  // 常见语义词列表
  const semanticWords = ['home', 'index', 'about', 'contact', 'product', 'detail', 'list', 'search', 'user', 'login', 'register', 'admin', 'test', 'demo']
  const lower = str.toLowerCase()
  return semanticWords.some(word => lower.includes(word))
}

// ========== 统一解析入口 ==========

/**
 * 智能解析分享文本或URL
 * 自动判断输入类型，依次执行：提取URL → 还原短链 → 提取标题 → 识别平台
 */
export async function parseShareInput(input: string): Promise<ParseResult> {
  const allSteps: ParseStep[] = []
  const trimmed = input.trim()

  if (!trimmed) {
    return {
      url: '',
      platform: 'other',
      steps: [{ step: '输入检查', status: 'failed', detail: '输入为空' }],
    }
  }

  // 1. 判断输入类型
  const isText = isShareText(trimmed)
  allSteps.push({
    step: '输入类型判断',
    status: 'success',
    detail: isText ? '识别为分享文本' : '识别为标准URL',
  })

  let cleanUrl: string
  let textTitle = ''

  if (isText) {
    // 2a. 从混合文本中提取URL
    const { url, steps: extractSteps } = extractUrlFromText(trimmed)
    allSteps.push(...extractSteps)

    if (!url) {
      return { url: '', platform: 'other', steps: allSteps }
    }
    cleanUrl = url

    // 3. 提取标题
    const { title, steps: titleSteps } = extractTitleFromText(trimmed, url)
    allSteps.push(...titleSteps)
    textTitle = title
  } else {
    // 2b. 直接作为URL使用
    cleanUrl = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed
    allSteps.push({ step: '提取URL', status: 'success', detail: '直接使用输入的URL', result: cleanUrl })
  }

  // 4. 短链还原
  const { resolvedUrl, steps: resolveSteps } = await resolveShortLink(cleanUrl)
  allSteps.push(...resolveSteps)
  console.log('[parseShareInput] resolvedUrl=' + resolvedUrl)

  // 4.5 抖音URL标准化：iesdouyin.com/share/video/{id} → www.douyin.com/video/{id}
  // 关键：抖音短链 v.douyin.com/xxx 重定向到 iesdouyin.com/share/video/{id} 中转分享页
  // 该页面 RENDER_DATA 仅有分享文案，没有完整视频元数据（coverImage 为空）
  // 必须改写为 www.douyin.com/video/{id} 真实视频详情页才能拿到完整元数据
  // previous_page=app_code_link 模拟"从APP复制链接"路径，避免被重定向到下载页
  const { url: stdUrl, transformed: stdTransformed, detail: stdDetail } = standardizeDouyinUrl(resolvedUrl)
  let effectiveResolvedUrl = resolvedUrl
  if (stdTransformed) {
    effectiveResolvedUrl = stdUrl
    allSteps.push({
      step: '抖音URL标准化',
      status: 'success',
      detail: stdDetail,
      result: stdUrl,
    })
    console.log('[parseShareInput] 抖音URL标准化: ' + resolvedUrl + ' → ' + stdUrl)
  }

  // 5. 识别平台
  const platform = detectPlatform(effectiveResolvedUrl)
  allSteps.push({ step: '识别平台', status: 'success', detail: `识别为 ${platform}`, result: platform })

  // 6. URL标准化（移除跟踪参数）
  const normalizedUrl = normalizeUrl(effectiveResolvedUrl)
  console.log('[normalizeUrl] in=' + effectiveResolvedUrl + ' out=' + normalizedUrl)
  if (normalizedUrl !== resolvedUrl) {
    allSteps.push({ step: 'URL标准化', status: 'success', detail: '已移除跟踪参数', result: normalizedUrl })
  }

  console.log('[parseShareInput] FINAL url=' + normalizedUrl)
  return {
    url: normalizedUrl,
    originalUrl: cleanUrl !== normalizedUrl ? cleanUrl : undefined,
    textTitle: textTitle || undefined,
    platform,
    steps: allSteps,
  }
}

// ========== 抖音URL标准化 ==========

/**
 * 抖音URL标准化
 * 关键问题：抖音短链 v.douyin.com/xxx 经过短链还原后会重定向到 iesdouyin.com/share/video/{id} 中转分享页
 * 该页面 RENDER_DATA 只有分享文案（title），没有 coverImage 等完整视频元数据
 * 真实视频详情页是 www.douyin.com/video/{id}，RENDER_DATA 含 videoDetail/awemeDetail
 *
 * 处理规则：
 * 1. iesdouyin.com/share/video/{id} → www.douyin.com/video/{id}?previous_page=app_code_link
 *    - previous_page=app_code_link 模拟"从APP复制链接"路径，避免PC端访问被重定向到下载页
 * 2. m.iesdouyin.com/share/video/{id} → 同上
 *
 * 兜底：保留 query 中的非追踪参数（如 mid/u_code），仅移除已知追踪参数
 */
export function standardizeDouyinUrl(url: string): { url: string; transformed: boolean; detail: string } {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    // 仅处理 iesdouyin.com 系列中转页
    if (host !== 'www.iesdouyin.com' && host !== 'iesdouyin.com' && host !== 'm.iesdouyin.com') {
      return { url, transformed: false, detail: '非iesdouyin中转页' }
    }

    // 匹配 /share/video/{awemeId} 模式
    const m = u.pathname.match(/^\/share\/video\/(\d+)\/?$/i)
    if (!m) {
      return { url, transformed: false, detail: '非share/video路径' }
    }

    const awemeId = m[1]
    // 重写为真实视频详情页，previous_page=app_code_link 模拟APP复制链接
    // 保留 query 中的非追踪参数（did/iid/u_code/share_sign 等是抖音去重必要参数）
    const targetUrl = new URL(`https://www.douyin.com/video/${awemeId}`)
    // 透传必要参数
    const KEEP_PARAMS = ['did', 'iid', 'mid', 'u_code', 'share_sign', 'share_version', 'video_share_track_ver', 'from_aid', 'from_ssr', 'ug_share_id']
    for (const key of KEEP_PARAMS) {
      const v = u.searchParams.get(key)
      if (v) targetUrl.searchParams.set(key, v)
    }
    // 关键参数：previous_page=app_code_link 模拟APP复制链接路径，避免PC端被重定向到下载页
    targetUrl.searchParams.set('previous_page', 'app_code_link')

    return {
      url: targetUrl.toString(),
      transformed: true,
      detail: `iesdouyin中转页→www.douyin.com/video/${awemeId}（含必要参数）`,
    }
  } catch {
    return { url, transformed: false, detail: 'URL解析失败' }
  }
}
