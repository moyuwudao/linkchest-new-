/**
 * 移动端内容安全预过滤（国内市场）
 *
 * 注意：这是**轻量级客户端预过滤**，仅做基础高危词拦截
 * 完整的内容审核在服务端（services/contentModeration.ts）通过腾讯云 TMS 完成
 * 此处目的是：
 * 1. 拦截明显违规内容,避免发到服务端被拒后用户输入丢失
 * 2. 即时反馈,提升交互体验
 * 3. 节省服务端 API 调用费用
 *
 * 仅在 isChinaMarket() 为 true 时启用
 */

import { isChinaMarket } from './market'

/**
 * 基础高危敏感词库（仅收录通用高危词,不收录政治/暴力等敏感词以免触发风控）
 * ⚠️ 注意：客户端词库与服务端词库可能不一致,服务端有最终决定权
 *
 * 维护原则：
 * - 包含基础违规词：色情、赌博、毒品、枪支、诈骗
 * - 不包含腾讯云特有的违规词（依赖服务端 TMS 兜底）
 * - 命中即提示用户修改,不做自动替换
 */
const BANNED_WORDS: string[] = [
  // 色情类
  '色情', '黄网', '约炮', '一夜情', '裸聊', '裸照', '援交',
  'porn', 'xxx', '成人视频', '黄片', '毛片',
  // 赌博类
  '赌博', '博彩', '赌场', '百家乐', '老虎机', '轮盘赌', '澳门威尼斯',
  'casino', 'gambling', 'lottery', 'betting',
  // 毒品/违禁药物
  '毒品', '冰毒', '海洛因', '大麻', 'K粉', '摇头丸', '可卡因',
  'drugs', 'cocaine', 'heroin', 'meth',
  // 枪支/武器
  '枪支', '手枪', '步枪', '弹药', '军火', '爆炸物',
  'gun', 'weapon', 'explosive',
  // 诈骗/违法
  '诈骗', '传销', '非法集资', '洗钱', '办证', '代开发票',
  'scam', 'fraud', 'money laundering',
  // 盗版/侵权
  '盗版', '破解版', '激活码', '序列号',
  'crack', 'pirated', 'keygen',
]

/**
 * 危险 URL 模式（钓鱼/赌博常见域名特征）
 */
const SUSPICIOUS_URL_PATTERNS: RegExp[] = [
  /casino/i, /poker/i, /bet\d/i, /porn/i, /xxx/i,
  /viagra/i, /pharmacy\d/i, /loans?\d/i,
]

export interface ModerationResult {
  safe: boolean
  /** 命中的敏感词（如果 safe=false） */
  hitWord?: string
  /** 原因描述 */
  reason?: string
}

/**
 * 检测文本是否包含敏感词
 */
export function moderateTextLocal(text: string): ModerationResult {
  if (!text) return { safe: true }

  const normalized = text.toLowerCase().trim()

  // 检测敏感词
  for (const word of BANNED_WORDS) {
    if (normalized.includes(word.toLowerCase())) {
      return {
        safe: false,
        hitWord: word,
        reason: `包含违规词: ${word}`,
      }
    }
  }

  return { safe: true }
}

/**
 * 检测 URL 是否可疑
 */
export function moderateUrlLocal(url: string): ModerationResult {
  if (!url) return { safe: true }

  for (const pattern of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(url)) {
      return {
        safe: false,
        reason: `链接包含可疑模式: ${pattern.source}`,
      }
    }
  }

  return { safe: true }
}

/**
 * 综合检测：审核收藏（title + note + url）
 * 返回第一个失败的结果
 */
export function moderateCollectionLocal(params: {
  title: string
  note?: string
  url?: string
}): ModerationResult {
  // 海外市场直接放行
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

/**
 * 审核用户昵称/用户名
 */
export function moderateNicknameLocal(nickname: string): ModerationResult {
  if (!isChinaMarket()) return { safe: true }
  return moderateTextLocal(nickname)
}

/**
 * 获取本地词库大小（用于调试/统计）
 */
export function getBannedWordsCount(): number {
  return BANNED_WORDS.length
}
