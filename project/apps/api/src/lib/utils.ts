/**
 * 安全地将 http:// 开头的 URL 升级为 https://
 * 支持标准 URL、协议相对 URL (//example.com) 和 data URI
 */
export function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null
  // 跳过已经是 https 或 data URI 的链接
  if (url.startsWith('https://') || url.startsWith('data:')) return url
  // 处理协议相对 URL
  if (url.startsWith('//')) return `https:${url}`
  // 处理 http:// 前缀
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://')
  // 无法识别的格式，原样返回
  return url
}

/**
 * 对集合对象中的 coverImage 做 https 强制升级 + 清理无效 SVG data URI
 */
export function sanitizeCollection<T extends { coverImage?: string | null }>(c: T): T {
  if (!c) return c
  let coverImage = ensureHttps(c.coverImage)
  // Mobile 旧版本可能存了 SVG data URI（React Native 不支持），清理为 null
  if (coverImage?.startsWith('data:image/svg')) {
    coverImage = null
  }
  return {
    ...c,
    coverImage,
  }
}
