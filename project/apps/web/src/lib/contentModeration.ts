/**
 * Web 端内容安全预过滤（国内市场）
 *
 * 与移动端保持一致：仅做基础高危词拦截,完整审核由服务端 TMS 完成
 * 仅在 isChinaMarket() 为 true 时启用
 */

/**
 * 是否国内版
 * 通过 hostname / NEXT_PUBLIC_API_URL 判断
 */
export function isChinaMarket(): boolean {
  if (typeof window === 'undefined') return false
  // 优先通过 API URL 判断
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
  if (apiUrl.includes('linkchest.cn')) return true
  if (apiUrl.includes('linkchest.net')) return false
  // 兜底：通过域名判断
  const hostname = window.location.hostname
  return hostname.includes('linkchest.cn')
}

/**
 * 基础高危敏感词库（与移动端保持一致）
 */
const BANNED_WORDS: string[] = [
  '色情', '黄网', '约炮', '一夜情', '裸聊', '裸照', '援交',
  'porn', 'xxx', '成人视频', '黄片', '毛片',
  '赌博', '博彩', '赌场', '百家乐', '老虎机', '轮盘赌', '澳门威尼斯',
  'casino', 'gambling', 'lottery', 'betting',
  '毒品', '冰毒', '海洛因', '大麻', 'K粉', '摇头丸', '可卡因',
  'drugs', 'cocaine', 'heroin', 'meth',
  '枪支', '手枪', '步枪', '弹药', '军火', '爆炸物',
  'gun', 'weapon', 'explosive',
  '诈骗', '传销', '非法集资', '洗钱', '办证', '代开发票',
  'scam', 'fraud', 'money laundering',
  '盗版', '破解版', '激活码', '序列号',
  'crack', 'pirated', 'keygen',
]

const SUSPICIOUS_URL_PATTERNS: RegExp[] = [
  /casino/i, /poker/i, /bet\d/i, /porn/i, /xxx/i,
  /viagra/i, /pharmacy\d/i, /loans?\d/i,
]

export interface ModerationResult {
  safe: boolean
  hitWord?: string
  reason?: string
}

export function moderateTextLocal(text: string): ModerationResult {
  if (!text) return { safe: true }
  const normalized = text.toLowerCase().trim()
  for (const word of BANNED_WORDS) {
    if (normalized.includes(word.toLowerCase())) {
      return { safe: false, hitWord: word, reason: `包含违规词: ${word}` }
    }
  }
  return { safe: true }
}

export function moderateUrlLocal(url: string): ModerationResult {
  if (!url) return { safe: true }
  for (const pattern of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(url)) {
      return { safe: false, reason: `链接包含可疑模式: ${pattern.source}` }
    }
  }
  return { safe: true }
}

export function moderateCollectionLocal(params: {
  title: string
  note?: string | null
  url?: string
}): ModerationResult {
  if (!isChinaMarket()) return { safe: true }
  const titleCheck = moderateTextLocal(params.title)
  if (!titleCheck.safe) return { ...titleCheck, reason: `标题${titleCheck.reason}` }
  if (params.note) {
    const noteCheck = moderateTextLocal(params.note)
    if (!noteCheck.safe) return { ...noteCheck, reason: `备注${noteCheck.reason}` }
  }
  if (params.url) {
    const urlCheck = moderateUrlLocal(params.url)
    if (!urlCheck.safe) return urlCheck
  }
  return { safe: true }
}

export function moderateNicknameLocal(nickname: string): ModerationResult {
  if (!isChinaMarket()) return { safe: true }
  return moderateTextLocal(nickname)
}
