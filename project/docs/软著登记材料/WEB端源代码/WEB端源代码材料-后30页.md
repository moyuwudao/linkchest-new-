﻿﻿import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { getRedisClient } from '../lib/redis'
import { JWT_SECRET } from '../lib/config'
import { AuthErrorCodes, AuthErrorCode, errorResponse } from '../lib/errorCodes'

interface SafeUser {
  id: string
  phone: string | null
  email: string | null
  username: string | null
  nickname: string | null
  avatar: string | null
  userTier: string
}

export type AuthRequest = Request & { user?: SafeUser }

export type AuthenticatedRequest = Request & { user: SafeUser }

const USER_CACHE_TTL_SECONDS = 300

function userCacheKey(userId: string): string {
  return `lc:user:${userId}:safe`
}

async function getCachedUser(userId: string): Promise<SafeUser | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const raw = await redis.get(userCacheKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as SafeUser
  } catch {
    return null
  }
}

async function setCachedUser(user: SafeUser): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.setex(userCacheKey(user.id), USER_CACHE_TTL_SECONDS, JSON.stringify(user))
  } catch {
    // 缓存写入失败不影响主流程
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    // 优先从 Redis 缓存读取用户信息
    let safeUser = await getCachedUser(decoded.userId)

    if (!safeUser) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        return errorResponse(res, 401, AuthErrorCodes.USER_NOT_FOUND)
      }

      // 检查用户状态
      if (user.status === 'banned') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
      }
      if (user.status === 'suspended') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
      }
      // 检查账号是否被锁定
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
      }

      safeUser = {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        userTier: user.userTier,
      }

      // 写入 Redis 缓存（异步，不阻塞请求）
      setCachedUser(safeUser).catch(() => {})
    }

    req.user = safeUser
    next()
  } catch (error) {
    return errorResponse(res, 401, AuthErrorCodes.TOKEN_INVALID)
  }
}

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

  // 5. 识别平台
  const platform = detectPlatform(resolvedUrl)
  allSteps.push({ step: '识别平台', status: 'success', detail: `识别为 ${platform}`, result: platform })

  // 6. URL标准化（移除跟踪参数）
  const normalizedUrl = normalizeUrl(resolvedUrl)
  console.log('[normalizeUrl] in=' + resolvedUrl + ' out=' + normalizedUrl)
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

import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { DEFAULT_LIST_KEY, DEFAULT_LIST_DESC } from '../lib/config'
import { detectPlatform, getSupportedPlatformList } from '../services/platforms'
import { classifyUrl } from '../services/pageClassifier'
import { fetchUrlMetadata } from '../services/metadata'
import { parseShareInput } from '../services/share-parser'
import { checkQuota, checkQuotaBatch, invalidateQuotaCache } from '../services/quota'
import { enqueueMetadataFetch } from '../services/metadata-queue'
import { recordCollectionCreated } from '../services/prom-metrics'
import { emitEvent } from '../lib/eventBus'

import fetch from 'node-fetch'
import { CollectionErrorCodes, ListErrorCodes, CommonErrorCodes, UploadErrorCodes, QuotaErrorCodes, errorResponse } from '../lib/errorCodes'
import { sanitizeCollection, ensureHttps } from '../lib/utils'
import logger from '../lib/logger'
import { isURL } from 'validator'

// ===== HTML 导入/导出辅助函数 =====

/**
 * 解析 Netscape Bookmark Format HTML
 * 返回扁平化的收藏列表，带 listName（超过3层扁平化到第3层）
 */
function parseBookmarkHtml(html: string): { url: string; title: string; listName: string | null; coverImage?: string }[] {
  const results: { url: string; title: string; listName: string | null; coverImage?: string }[] = []
  const folderStack: { name: string; depth: number }[] = []
  let dlDepth = 0

  for (const rawLine of html.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (/<DL>/i.test(line)) {
      dlDepth++
      continue
    }
    if (/<\/DL>/i.test(line)) {
      dlDepth = Math.max(0, dlDepth - 1)
      while (folderStack.length > 0 && folderStack[folderStack.length - 1].depth > dlDepth) {
        folderStack.pop()
      }
      continue
    }

    const h3Match = line.match(/<H3[^>]*>(.*?)<\/H3>/i)
    if (h3Match) {
      const name = h3Match[1].replace(/<[^>]+>/g, '').trim()
      if (!name) continue
      if (folderStack.length >= 3) {
        folderStack[2] = { name, depth: dlDepth }
      } else {
        folderStack.push({ name, depth: dlDepth })
      }
      continue
    }

    const aMatch = line.match(/<A\s+([^>]*)>(.*?)<\/A>/i)
    if (aMatch) {
      const attrs = aMatch[1]
      const title = aMatch[2].replace(/<[^>]+>/g, '').trim()

      const hrefMatch = attrs.match(/HREF=["']([^"']+)["']/i)
      const url = hrefMatch ? hrefMatch[1].trim() : ''

      const iconMatch = attrs.match(/ICON=["']([^"']+)["']/i)
      const coverImage = iconMatch ? iconMatch[1].trim() : undefined

      if (url && url.startsWith('http')) {
        const listName = folderStack.length > 0 ? folderStack[folderStack.length - 1].name : null
        results.push({ url, title, listName, coverImage })
      }
    }
  }

  return results
}

/**
 * 生成 Netscape Bookmark Format HTML
 */
function generateBookmarkHtml(collections: { id: string; title: string; url: string; coverImage?: string | null; createdAt: Date; lists: { name: string }[] }[], lists: { name: string }[], includeCover: boolean = false): string {
  // 按列表分组
  const byList = new Map<string, typeof collections>()
  const noList: typeof collections = []

  for (const c of collections) {
    if (c.lists && c.lists.length > 0) {
      for (const l of c.lists) {
        if (!byList.has(l.name)) byList.set(l.name, [])
        byList.get(l.name)!.push(c)
      }
    } else {
      noList.push(c)
    }

  }

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]

  // 无分组的收藏
  if (noList.length > 0) {
    lines.push('    <DT><H3>Ungrouped</H3>')
    lines.push('    <DL><p>')
    for (const c of noList) {
      const addDate = Math.floor(c.createdAt.getTime() / 1000)
      const coverAttr = (includeCover && c.coverImage) ? ` ICON="${escapeHtml(c.coverImage)}"` : ''
      lines.push(`        <DT><A HREF="${escapeHtml(c.url)}" ADD_DATE="${addDate}"${coverAttr}>${escapeHtml(c.title || 'Untitled')}</A>`)
    }
    lines.push('    </DL><p>')
  }

  // 有分组的收藏
  for (const [listName, items] of byList) {
    lines.push(`    <DT><H3>${escapeHtml(listName)}</H3>`)
    lines.push('    <DL><p>')
    for (const c of items) {
      const addDate = Math.floor(c.createdAt.getTime() / 1000)
      lines.push(`        <DT><A HREF="${escapeHtml(c.url)}" ADD_DATE="${addDate}">${escapeHtml(c.title || '无标题')}</A>`)
    }
    lines.push('    </DL><p>')
  }

  lines.push('</DL><p>')
  return lines.join('\n')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const router = Router()

// 注意：分组筛选只匹配直接关联的收藏，不包含子分组中的收藏
// 每个分组只展示属于该分组自身的收藏

/**
 * 构建收藏查询的 where 条件（复用于 offset 分页和游标分页）
 */

async function buildCollectionWhere(
  userId: string,
  filters: {
    tagId?: string
    listId?: string
    directListId?: string
    platform?: string
    platforms?: string
    search?: string
    hasRating?: string
  }
): Promise<Prisma.CollectionWhereInput> {
  const where: Prisma.CollectionWhereInput = { userId, deletedAt: null }

  if (filters.tagId) {
    where.tags = { some: { id: filters.tagId } }
  }

  if (filters.platform) {
    where.platform = filters.platform
  }

  if (filters.platforms) {
    const platformArray = filters.platforms.split(',').filter(Boolean)
    if (platformArray.length > 0) {
      where.platform = { in: platformArray }
    }
  }

  if (filters.listId) {
    const allLists = await prisma.list.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    })

    const childrenMap = new Map<string, string[]>()
    for (const list of allLists) {
      if (list.parentId) {
        if (!childrenMap.has(list.parentId)) childrenMap.set(list.parentId, [])
        childrenMap.get(list.parentId)!.push(list.id)
      }
    }

    function collectDescendants(id: string): string[] {
      const ids = [id]
      const children = childrenMap.get(id) || []
      for (const childId of children) {
        ids.push(...collectDescendants(childId))
      }
      return ids
    }

    const allListIds = collectDescendants(filters.listId)
    where.lists = { some: { id: { in: allListIds } } }
  }

  if (filters.directListId) {
    where.lists = { some: { id: filters.directListId } }
  }

  if (filters.hasRating === 'true') {
    where.rating = { not: null }
  } else if (filters.hasRating === 'false') {
    where.rating = null
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { note: { contains: filters.search, mode: 'insensitive' } },
      { url: { contains: filters.search, mode: 'insensitive' } },
      { platform: { contains: filters.search, mode: 'insensitive' } },
      { tags: { some: { name: { contains: filters.search, mode: 'insensitive' } } } },
      { lists: { some: { name: { contains: filters.search, mode: 'insensitive' } } } },
    ]
  }

  return where
}

/**
 * 构建排序条件，支持按评分排序且 null 始终在最后
 */
function buildCollectionOrderBy(sortBy: string, sortOrder: string): Prisma.CollectionOrderByWithRelationInput[] {
  const order: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

  if (sortBy === 'rating') {
    // 按评分排序：有评分的按评分值排序，无评分（null）始终在最后
    return [
      { rating: { sort: order, nulls: 'last' } },
      { createdAt: 'desc' },
    ]
  }

  return [{ createdAt: order }]
}

// 获取收藏（Offset 分页 - 兼容旧接口）
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 2000 }),
  query('tagId').optional().isUUID(),
  query('listId').optional().isUUID(),

  query('directListId').optional().isUUID(),
  query('platform').optional().isString(),
  query('platforms').optional().isString(),
  query('search').optional().isString(),
  query('hasRating').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const q = req.query as { page?: string; limit?: string; tagId?: string; listId?: string; directListId?: string; platform?: string; platforms?: string; search?: string; hasRating?: string; sortBy?: string; sortOrder?: string }
  const page = Number(q.page) || 1
  const limit = Number(q.limit) || 20
  const userId = req.user.id
  const sortBy = q.sortBy || 'createdAt'
  const sortOrder = q.sortOrder || 'desc'

  try {
    const where = await buildCollectionWhere(userId, {
      tagId: q.tagId,
      listId: q.listId,
      directListId: q.directListId,
      platform: q.platform,
      platforms: q.platforms,
      search: q.search,
      hasRating: q.hasRating,
    })

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          tags: { select: { id: true, name: true } },
          lists: { select: { id: true, name: true } },
        },
        orderBy: buildCollectionOrderBy(sortBy, sortOrder),
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.collection.count({ where }),
    ])

    res.json({
      data: collections.map(sanitizeCollection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_FETCH_FAILED)
  }
})

// 获取收藏 V2（游标分页 - 高性能）
router.get('/v2', authenticate, [
  query('cursor').optional().isUUID().withMessage('cursor 必须是有效的 UUID'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('tagId').optional().isUUID(),
  query('listId').optional().isUUID(),
  query('directListId').optional().isUUID(),
  query('platform').optional().isString(),
  query('platforms').optional().isString(),
  query('search').optional().isString(),
  query('hasRating').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const q = req.query as { cursor?: string; limit?: string; tagId?: string; listId?: string; directListId?: string; platform?: string; platforms?: string; search?: string; hasRating?: string; sortBy?: string; sortOrder?: string }
  const cursor = q.cursor
  const limit = Math.min(Number(q.limit) || 40, 100)
  const userId = req.user.id
  const sortBy = q.sortBy || 'createdAt'
  const sortOrder = q.sortOrder || 'desc'

  try {
    const where = await buildCollectionWhere(userId, {
      tagId: q.tagId,
      listId: q.listId,
      directListId: q.directListId,
      platform: q.platform,
      platforms: q.platforms,
      search: q.search,
      hasRating: q.hasRating,
    })

    // 游标分页：多取一条用于判断 hasMore
    const collections = await prisma.collection.findMany({
      where,
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
      orderBy: buildCollectionOrderBy(sortBy, sortOrder),
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
    })

    const hasMore = collections.length > limit
    const data = hasMore ? collections.slice(0, limit) : collections
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined

    res.json({
      data: data.map(sanitizeCollection),
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取收藏 V2 错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_FETCH_FAILED)
  }
})

// 添加收藏
router.post('/', authenticate, [
  body('url').custom((value) => {
    const processed = ensureHttps(value)
    return !!processed && isURL(processed)
  }).withMessage('请输入有效的URL'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题不能为空且不超过200字符'),
  body('note').optional().isLength({ max: 100 }).withMessage('备注不超过100字符'),
  body('rating').optional().isFloat({ min: 0.5, max: 5 }).withMessage('评分需在 0.5-5 之间'),
  body('tagIds').optional().isArray(),
  body('listIds').optional().isArray({ max: 1 }).withMessage('一个收藏只能属于一个分组'),
  body('coverStrategy').optional().isIn(['url', 'brand', 'ai']).withMessage('封面策略只能是 url、brand 或 ai'),
  body('pageType').optional().isIn(['home', 'detail', 'list', 'search', 'navigation', 'document', 'download', 'other']).withMessage('页面类型不正确'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url, title, coverImage, note, rating, tagIds = [], listIds = [], coverStrategy, pageType } = req.body

  const userId = req.user.id
  const platform = detectPlatform(url)

  try {
    // 配额检查
    const quotaError = await checkQuota(userId, 'collections')
    if (quotaError) {
      return errorResponse(res, 403, quotaError)
    }

    // 确保用户有默认分组
    // 分组唯一性限制：一个收藏只能属于一个分组，只取第一个 listId
    let defaultListIds = [...listIds]
    if (defaultListIds.length > 1) {
      defaultListIds = [defaultListIds[0]]
    }
    if (defaultListIds.length === 0) {
      let defaultList = await prisma.list.findFirst({
        where: { userId, name: DEFAULT_LIST_KEY },
      })
      if (!defaultList) {
        // 兼容旧数据
        defaultList = await prisma.list.findFirst({
          where: { userId, name: '我的收藏' },
        })
      }
      if (!defaultList) {
        defaultList = await prisma.list.create({
          data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC },
        })
      }
      defaultListIds = [defaultList.id]
    }

    const collection = await prisma.collection.create({
      data: {
        userId,
        url,
        title,
        coverImage,
        platform,
        pageType,
        note,
        rating: rating !== undefined && rating !== null ? new Prisma.Decimal(rating) : null,
        tags: tagIds.length > 0 ? { connect: tagIds.map((id: string) => ({ id })) } : undefined,
        lists: { connect: defaultListIds.map((id: string) => ({ id })) },
      },
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
    })

import fetch from 'node-fetch'
import https from 'https'
import ogs from 'open-graph-scraper'
import { LRUCache } from 'lru-cache'
import { getRedisClient } from '../lib/redis'
import { METADATA_CONFIG } from '../lib/config'
import logger from '../lib/logger'

// ===== 监控统计 =====
const metadataStats = {
  total: 0,        // 总调用次数
  lruHit: 0,       // LRU 缓存命中
  redisHit: 0,     // Redis 缓存命中
  success: 0,      // 成功抓取（有 title 或 coverImage）
  failed: 0,       // 完全失败（无 title 且无 coverImage）
}

export function getMetadataStats() {
  const { total, lruHit, redisHit, success, failed } = metadataStats
  const cacheHits = lruHit + redisHit
  const cacheHitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(1) : '0.0'
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0'
  return {
    total,
    lruHit,
    redisHit,
    cacheHitRate,
    cacheHits,
    success,
    failed,
    successRate,
  }
}

export interface UrlMetadata {
  title: string | null
  coverImage: string | null
  favicon: string | null
  description: string | null
}

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || ''
const WORKER_FALLBACK_PLATFORMS = [
  'youtube','bilibili','douyin','xiaohongshu','zhihu','weibo','wechat',
  'twitter','tiktok','instagram','facebook','twitch','kuaishou',
  'tencent-video','iqiyi','youku','mgtv','dianping','xueqiu','36kr',
  'toutiao','huxiu','thepaper','netease-news',
]

function extractBV(url: string): string | null {
  try { const m = new URL(url).pathname.match(/\/video\/(BV[a-zA-Z0-9]{10})/); return m ? m[1] : null } catch { return null }
}
function normalizeYoutubeUrl(url: string): string {
  const m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : url
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
const DESKTOP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = METADATA_CONFIG.fetchTimeoutMs
const TOTAL_TIMEOUT_MS = METADATA_CONFIG.totalTimeoutMs
const CACHE_TTL_SECONDS = METADATA_CONFIG.cacheTtlSeconds

const httpsAgent = new https.Agent({
  rejectUnauthorized: !(process.env.METADATA_ALLOW_INSECURE === 'true'),
})

const lruCache = new LRUCache<string, UrlMetadata>({
  max: METADATA_CONFIG.lruCacheMaxSize,
  ttl: 1000 * 60 * 5,
})

function isAntiBotPage(html: string): boolean {
  if (html.includes('_$jsvmprt')) return true
  if (html.includes('<body></body>') && html.length < 80000) return true
  if (!html.includes('<meta property="og:') && !html.includes('<h1') && html.length < 50000) return true
  return false
}

interface OEmbedConfig { endpoint: (url: string) => string }

const OEMBED_PROVIDERS: Record<string, OEmbedConfig> = {
  youtube:    { endpoint: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json` },
  spotify:    { endpoint: (url) => `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}` },
  tiktok:     { endpoint: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` },
  twitch:     { endpoint: (url) => `https://api.twitch.tv/v4/oembed?url=${encodeURIComponent(url)}` },
  twitter:    { endpoint: (url) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}` },
  vimeo:      { endpoint: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}` },
  soundcloud: { endpoint: (url) => `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json` },
  flickr:     { endpoint: (url) => `https://www.flickr.com/services/oembed/?url=${encodeURIComponent(url)}&format=json` },
  instagram:  { endpoint: (url) => `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}` },
  bilibili:   { endpoint: (url) => { const bv = extractBV(url); return bv ? `https://api.bilibili.com/x/web-interface/view?bvid=${bv}&jsonp=jsonp` : `https://www.bilibili.com/oembed?url=${encodeURIComponent(url)}` } },
  reddit:     { endpoint: (url) => `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}` },
  pinterest:  { endpoint: (url) => `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}` },
}

const PLATFORM_UA_MAP: Record<string, string> = {
  xiaohongshu: DESKTOP_USER_AGENT, douyin: DEFAULT_USER_AGENT,
  bilibili: DESKTOP_USER_AGENT, zhihu: DESKTOP_USER_AGENT,
  weibo: DESKTOP_USER_AGENT, 'tencent-video': DESKTOP_USER_AGENT,
  iqiyi: DESKTOP_USER_AGENT, youku: DESKTOP_USER_AGENT,
  mgtv: DESKTOP_USER_AGENT, kuaishou: DESKTOP_USER_AGENT,
  dianping: DESKTOP_USER_AGENT,
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS)
  try {
    return await fetchUrlMetadataCore(url, controller.signal)
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message === 'TOTAL_TIMEOUT')) {
      console.log(`[fetchUrlMetadata] TOTAL_TIMEOUT fallback for ${url}`)
      try { const { detectPlatform } = await import('./platforms'); const pk = detectPlatform(url); if (pk !== 'other') return getPlatformFallbackMetadata(pk, url) } catch {}
    }
    return { title: null, coverImage: null, favicon: null, description: null }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchOgsMetadata(url: string, platformKey?: string, signal?: AbortSignal): Promise<UrlMetadata> {
  if (signal?.aborted) {
    return { title: null, coverImage: null, favicon: null, description: null }
  }
  try {
    const ua = platformKey && PLATFORM_UA_MAP[platformKey] ? PLATFORM_UA_MAP[platformKey] : DESKTOP_USER_AGENT
    const ogsPromise = ogs({
      url, timeout: { request: FETCH_TIMEOUT_MS },
      headers: { 'User-Agent': ua },
      onlyGetOpenGraphInfo: false, followRedirect: true, maxRedirects: 5,
    })

    const { error, result } = signal
      ? await Promise.race([
          ogsPromise,
          new Promise<never>((_, reject) => {
            const handler = () => reject(new Error('AbortError'))
            signal.addEventListener('abort', handler, { once: true })
          }),
        ])
      : await ogsPromise

    if (error || !result) return { title: null, coverImage: null, favicon: null, description: null }
    const r = result as unknown as {
      ogTitle?: string
      ogImage?: { url: string }[]
      twitterTitle?: string
      twitterImage?: { url: string }[]
      articleTitle?: string
      ogDescription?: string
      twitterDescription?: string
      favicon?: string
    }
    const ogImage = r.ogImage?.[0]
    return {
      title: r.ogTitle || r.twitterTitle || r.articleTitle || null,
      coverImage: ensureHttps(ogImage?.url || r.twitterImage?.[0]?.url || null),
      favicon: ensureHttps(r.favicon || null),
      description: r.ogDescription || r.twitterDescription || null,
    }
  } catch (err) {
    logger.error({ url, err }, '[fetchOgsMetadata] 失败')
    return { title: null, coverImage: null, favicon: null, description: null }
  }
}

