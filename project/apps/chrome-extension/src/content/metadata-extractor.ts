/**
 * LinkChest Content Script — 页面元数据提取
 * 在目标页面中注入，负责提取标题、封面、平台等信息
 */

// ========== 类型定义 ==========

interface ExtractedMetadata {
  title: string
  coverImage: string | null
  coverStrategy: 'url' | 'brand'
  platform: string
  siteName: string
  description: string
  favicon: string | null
}

interface CoverExtractorResult {
  coverImage: string | null
  title?: string
}

// ========== 平台域名映射 ==========

const PLATFORM_DOMAIN_MAP: Record<string, string> = {
  'douyin.com': 'douyin',
  'iesdouyin.com': 'douyin',
  'xiaohongshu.com': 'xiaohongshu',
  'xhslink.com': 'xiaohongshu',
  'bilibili.com': 'bilibili',
  'b23.tv': 'bilibili',
  'weibo.com': 'weibo',
  'weibo.cn': 'weibo',
  'zhihu.com': 'zhihu',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'twitter.com': 'twitter',
  'x.com': 'twitter',
  'tiktok.com': 'tiktok',
  'instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'reddit.com': 'reddit',
  'pinterest.com': 'pinterest',
  'github.com': 'github',
  'linkedin.com': 'linkedin',
  'twitch.tv': 'twitch',
  'vimeo.com': 'vimeo',
  'kuaishou.com': 'kuaishou',
  'v.kuaishou.com': 'kuaishou',
  'taobao.com': 'taobao',
  'tmall.com': 'taobao',
  'jd.com': 'jd',
  'amazon.com': 'amazon',
  'spotify.com': 'spotify',
  'medium.com': 'medium',
  'discord.com': 'discord',
}

// ========== 辅助函数 ==========

function detectPlatform(): string {
  const host = window.location.hostname.toLowerCase()
  for (const [domain, platform] of Object.entries(PLATFORM_DOMAIN_MAP)) {
    if (host.includes(domain)) return platform
  }
  return 'other'
}

function getMetaContent(selector: string): string | null {
  const el = document.querySelector(selector) as HTMLMetaElement | null
  return el?.content || el?.getAttribute('content') || null
}

function getOpenGraph(key: string): string | null {
  return getMetaContent(`meta[property="og:${key}"]`)
}

function getTwitterCard(key: string): string | null {
  return getMetaContent(`meta[name="twitter:${key}"]`)
}

function isPlaceholderImage(url: string): boolean {
  if (!url) return true
  const lower = url.toLowerCase()
  const placeholderPatterns = [
    'placeholder',
    '/placeholder', 'default_cover', 'no-cover',
    'default-avatar', 'empty-state', '1x1',
  ]
  for (const p of placeholderPatterns) {
    if (lower.includes(p)) return true
  }
  if (lower.endsWith('.svg') && (lower.includes('placeholder') || lower.includes('default'))) {
    return true
  }
  return false
}

function isValidImageUrl(url: string | null): boolean {
  if (!url) return false
  if (url.startsWith('data:')) return !url.includes('data:image/svg')
  // 支持协议相对URL（//example.com/image.jpg）
  if (url.startsWith('//')) return !isPlaceholderImage(url)
  return url.startsWith('http') && !isPlaceholderImage(url)
}

// ========== 抖音：API获取封面和标题 ==========

async function extractDouyinCover(): Promise<CoverExtractorResult> {
  try {
    // 尝试多种方式提取 videoId
    let videoId = ''

    // 方式1：URL 路径 /video/{videoId}
    const videoMatch = window.location.pathname.match(/\/video\/(\d+)/)
    if (videoMatch) {
      videoId = videoMatch[1]
    }

    // 方式2：URL 参数 modal_id
    if (!videoId) {
      const params = new URLSearchParams(window.location.search)
      videoId = params.get('modal_id') || ''
    }

    // 方式3：页面数据
    if (!videoId) {
      const scripts = document.querySelectorAll('script')
      for (const script of scripts) {
        const match = script.textContent?.match(/"aweme_id"\s*:\s*"?(\d+)"?/)
        if (match) {
          videoId = match[1]
          break
        }
      }
    }

    // 方式4：RENDER_DATA / SSR_DATA 等
    if (!videoId) {
      for (const key of ['RENDER_DATA', 'SSR_DATA', '__UNIVERSAL_DATA__', '__NUXT__']) {
        try {
          const data = (window as any)[key]
          if (data) {
            const json = typeof data === 'string' ? data : JSON.stringify(data)
            const match = json.match(/"aweme_id"\s*:\s*"?(\d+)"?/)
            if (match) {
              videoId = match[1]
              break
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (!videoId) {
      console.log('[LinkChest] Douyin: videoId not found')
      return { coverImage: null }
    }

    console.log('[LinkChest] Douyin: fetching via API, videoId=', videoId)

    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`
    const response = await fetch(apiUrl, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    })

    let apiCover: string | null = null
    let apiTitle: string | null = null

    if (response.ok) {
      const json = await response.json()
      const item = json?.item_list?.[0]

      if (item) {
        // 提取封面：优先 video.cover.url_list[0]，其次 video.dynamic_cover.url_list[0]
        const coverList = item.video?.cover?.url_list || item.video?.dynamic_cover?.url_list
        if (coverList && coverList.length > 0) {
          apiCover = coverList[0]
        }

        // 提取标题
        apiTitle = item.desc || item.share_info?.share_title || ''

        console.log('[LinkChest] Douyin API OK: cover=', apiCover?.substring(0, 60), 'title=', apiTitle?.substring(0, 40))
        return {
          coverImage: isValidImageUrl(apiCover) ? apiCover : null,
          title: apiTitle || undefined,
        }
      }

      // API 返回空数据（如 encrypt_data_miss），记录日志
      console.log('[LinkChest] Douyin API: no item_list, status_code=', json?.status_code, 'msg=', json?.status_msg)
    } else {
      console.log('[LinkChest] Douyin API HTTP error:', response.status)
    }

    // ★ API 失败时，从 DOM 提取标题和封面
    const domTitle = extractDouyinTitleFromDOM()
    const domCover = extractDouyinCoverFromDOM()

    console.log('[LinkChest] Douyin DOM fallback: cover=', domCover?.substring(0, 60), 'title=', domTitle?.substring(0, 40))
    return {
      coverImage: isValidImageUrl(domCover) ? domCover : null,
      title: domTitle || undefined,
    }
  } catch (err) {
    console.log('[LinkChest] Douyin extract error:', err)
    return { coverImage: null }
  }
}

/**
 * 获取当前在视口内的抖音视频 section
 * 抖音 jingxuan 是垂直滑动布局，所有视频都在 DOM 中，需要找当前可见的
 */
function getCurrentDouyinVideoSection(): Element | null {
  const modalId = new URLSearchParams(window.location.search).get('modal_id')

  // 方式1：通过 modalId 匹配 class
  if (modalId) {
    const section = document.querySelector(`[class*="video_${modalId}"]`)
    if (section) return section
  }

  // 方式2：找在视口内的 video section（jingxuan 垂直滑动）
  const sections = document.querySelectorAll('[class*="video_"]')
  for (const section of sections) {
    const rect = section.getBoundingClientRect()
    // 当前可见：在视口内且面积足够大
    if (rect.top >= -50 && rect.top <= window.innerHeight / 2 && rect.height > 100) {
      return section
    }
  }

  return null
}

/**
 * 从DOM提取抖音视频标题（API兜底方案）
 *
 * 策略：
 *   - 找当前可见视频的 [data-e2e="video-desc"]（处理 jingxuan 多视频同时存在）
 *   - document.title 在精选页/video页可用，但用户主页是用户名不能用
 */
function extractDouyinTitleFromDOM(): string {
  const isUserPage = window.location.pathname.startsWith('/user/')

  function cleanText(raw: string): string {
    let t = raw.replace(/展开\s*$/, '').trim()
    t = t.replace(/\s*#\S+.*$/, '').trim()
    return t
  }

  // 策略1：从当前可见视频区域找 [data-e2e="video-desc"]
  let domTitle = ''
  const currentSection = getCurrentDouyinVideoSection()
  if (currentSection) {
    const e2eEl = currentSection.querySelector('[data-e2e="video-desc"]')
    if (e2eEl) {
      domTitle = cleanText(e2eEl.textContent || '')
    }
  }

  // 策略1b：如果没找到，回退到全局 querySelector（兼容单视频页面）
  if (!domTitle) {
    const e2eEl = document.querySelector('[data-e2e="video-desc"]')
    if (e2eEl) {
      domTitle = cleanText(e2eEl.textContent || '')
    }
  }

  // 策略2：document.title（用户主页不可靠）
  let docTitle = ''
  if (!isUserPage) {
    docTitle = document.title.replace(/\s*[-–—|]\s*抖音\s*$/, '').trim()
  }

  // 用户主页：只用 DOM 结果
  if (isUserPage) return domTitle.length > 2 ? domTitle : ''

  // 非用户主页：DOM > docTitle
  return (domTitle.length > 2 ? domTitle : docTitle) || ''
}

/**
 * 从DOM提取抖音视频封面（API兜底方案）
 */
function extractDouyinCoverFromDOM(): string | null {
  // 1. og:image
  const ogImage = getOpenGraph('image')
  if (ogImage && isValidImageUrl(ogImage)) return ogImage

  // 2. twitter:image
  const twImage = getTwitterCard('image')
  if (twImage && isValidImageUrl(twImage)) return twImage

  // 3. video[poster]
  const video = document.querySelector('video[poster]') as HTMLVideoElement | null
  if (video?.poster && isValidImageUrl(video.poster)) return video.poster

  // 4. 从当前可见视频区域提取封面图片（过滤头像等小图）
  const currentSection = getCurrentDouyinVideoSection()
  if (currentSection) {
    const imgs = currentSection.querySelectorAll('img')
    for (const img of imgs) {
      const el = img as HTMLImageElement
      // 过滤明显的小图（头像等）
      if ((el.naturalWidth > 0 && el.naturalWidth < 200) ||
          (el.naturalHeight > 0 && el.naturalHeight < 200)) continue
      if (isValidImageUrl(el.src)) return el.src
    }
  }

  return null
}

// ========== 平台专属封面提取 ==========

const platformCoverExtractors: Record<string, () => Promise<CoverExtractorResult>> = {
  douyin: extractDouyinCover,

  xiaohongshu: async () => {
    // 小红书是 SPA，从首页点击笔记后 URL 变但页面不刷新
    // 需要区分：当前是笔记详情页还是首页
    const isNotePage = /\/explore\/[a-z0-9]+/.test(window.location.pathname)
    console.log('[LinkChest] XHS: isNotePage =', isNotePage, 'pathname =', window.location.pathname)

    // 1. og:image 优先（避免懒加载延迟）
    const ogImage = getOpenGraph('image')
    console.log('[LinkChest] XHS: og:image =', ogImage?.substring(0, 80))
    if (ogImage && isValidImageUrl(ogImage)) {
      console.log('[LinkChest] XHS: using og:image')
      return { coverImage: ogImage }
    }

    // 2. 备用：meta thumbnail
    const thumbnail = getMetaContent('meta[name="thumbnail"]')
    console.log('[LinkChest] XHS: thumbnail =', thumbnail?.substring(0, 80))
    if (thumbnail && isValidImageUrl(thumbnail)) {
      console.log('[LinkChest] XHS: using thumbnail')
      return { coverImage: thumbnail }
    }

    // 3. 备用：twitter:image
    const twImage = getTwitterCard('image')
    console.log('[LinkChest] XHS: twitter:image =', twImage?.substring(0, 80))
    if (twImage && isValidImageUrl(twImage)) {
      console.log('[LinkChest] XHS: using twitter:image')
      return { coverImage: twImage }
    }

    // 4. 备用：link[rel="image_src"]
    const imageSrc = document.querySelector('link[rel="image_src"]')?.getAttribute('href') || null
    console.log('[LinkChest] XHS: image_src =', imageSrc?.substring(0, 80))
    if (isValidImageUrl(imageSrc)) {
      console.log('[LinkChest] XHS: using image_src')
      return { coverImage: imageSrc }
    }

    // 5. 笔记详情页：找当前笔记的大图（在视口内或笔记容器内）
    if (isNotePage) {
      // 策略 A：找在视口内的大图（当前显示的笔记）
      const allImgs = document.querySelectorAll('img[src*="sns-webpic"]')
      console.log('[LinkChest] XHS: total sns-webpic images =', allImgs.length)

      // 先找在视口内的大图
      for (const img of allImgs) {
        const el = img as HTMLImageElement
        const rect = el.getBoundingClientRect()
        // 在视口内、尺寸足够大
        if (rect.top >= -100 && rect.top <= window.innerHeight &&
            rect.width > 200 && rect.height > 200) {
          if (isValidImageUrl(el.src)) {
            console.log('[LinkChest] XHS: using viewport img', el.src.substring(0, 80))
            return { coverImage: el.src }
          }
        }
      }

      // 策略 B：找笔记容器内的大图
      const noteContainers = document.querySelectorAll(
        '#noteContainer, [class*="note-detail"], [class*="note-content"], [class*="note-page"], [class*="note-scroller"]'
      )
      console.log('[LinkChest] XHS: note containers found =', noteContainers.length)
      for (const container of noteContainers) {
        const imgs = container.querySelectorAll('img[src*="sns-webpic"]')
        for (const img of imgs) {
          const el = img as HTMLImageElement
          if (el.naturalWidth > 0 && el.naturalWidth < 150) continue
          if (el.naturalHeight > 0 && el.naturalHeight < 150) continue
          if (isValidImageUrl(el.src)) {
            console.log('[LinkChest] XHS: using note container img', el.src.substring(0, 80))
            return { coverImage: el.src }
          }
        }
      }
    }

    // 6. 首页或 fallback：取第一张尺寸合适的 sns-webpic
    const webpicImgs = document.querySelectorAll('img[src*="sns-webpic"]')
    console.log('[LinkChest] XHS: sns-webpic images found =', webpicImgs.length)
    for (const img of webpicImgs) {
      const el = img as HTMLImageElement
      if (el.naturalWidth > 0 && el.naturalWidth < 150) continue
      if (el.naturalHeight > 0 && el.naturalHeight < 150) continue
      const src = el.src
      if (isValidImageUrl(src)) {
        console.log('[LinkChest] XHS: using sns-webpic img', src.substring(0, 80))
        return { coverImage: src }
      }
    }

    // 7. 最后 fallback：note-content 区域
    const noteImgs = document.querySelectorAll('#noteContainer img, .note-content img, .note-scroller img')
    console.log('[LinkChest] XHS: note images found =', noteImgs.length)
    for (const img of noteImgs) {
      const el = img as HTMLImageElement
      if (el.naturalWidth > 0 && el.naturalWidth < 150) continue
      if (el.naturalHeight > 0 && el.naturalHeight < 150) continue
      const src = el.src
      if (isValidImageUrl(src)) {
        console.log('[LinkChest] XHS: using note img', src.substring(0, 80))
        return { coverImage: src }
      }
    }

    console.log('[LinkChest] XHS: no cover found')
    return { coverImage: null }
  },

  bilibili: async () => {
    // og:image
    const ogImage = getOpenGraph('image')
    if (ogImage && isValidImageUrl(ogImage)) {
      return { coverImage: ogImage }
    }
    // meta itemprop="image"
    const itemImage = getMetaContent('meta[itemprop="image"]')
    if (itemImage && isValidImageUrl(itemImage)) {
      return { coverImage: itemImage }
    }
    return { coverImage: null }
  },

  zhihu: async () => {
    // og:image
    const ogImage = getOpenGraph('image')
    if (ogImage && isValidImageUrl(ogImage)) {
      return { coverImage: ogImage }
    }
    // twitter:image
    const twImage = getTwitterCard('image')
    if (twImage && isValidImageUrl(twImage)) {
      return { coverImage: twImage }
    }
    return { coverImage: null }
  },

  weibo: async () => {
    // og:image / twitter:image
    const ogImage = getOpenGraph('image') || getTwitterCard('image')
    if (ogImage && isValidImageUrl(ogImage)) {
      return { coverImage: ogImage }
    }
    // 微博详情页图片
    const imgs = document.querySelectorAll('.WB_editor_iframe_new img, .card-wrap img[src*="sinaimg"]')
    for (const img of imgs) {
      const src = (img as HTMLImageElement).src
      if (isValidImageUrl(src)) return { coverImage: src }
    }
    return { coverImage: null }
  },

  youtube: async () => {
    // 提取 videoId
    const params = new URLSearchParams(window.location.search)
    let videoId = params.get('v') || ''
    if (!videoId) {
      const match = window.location.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]+)/)
      if (match) videoId = match[2]
    }

    if (videoId) {
      // 构造高清封面URL
      const coverUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
      // 标题：document.title 优先（YouTube动态更新标题）
      const title = document.title.replace(/\s*-\s*YouTube$/, '').trim()
      return { coverImage: coverUrl, title: title || undefined }
    }
    return { coverImage: null }
  },

  twitter: async () => {
    const ogImage = getOpenGraph('image') || getTwitterCard('image')
    return { coverImage: isValidImageUrl(ogImage) ? ogImage : null }
  },

  tiktok: async () => {
    const ogImage = getOpenGraph('image') || getTwitterCard('image')
    if (ogImage && isValidImageUrl(ogImage)) {
      return { coverImage: ogImage }
    }
    // 视频缩略图
    const poster = document.querySelector('video[poster]') as HTMLVideoElement | null
    if (poster?.poster && isValidImageUrl(poster.poster)) {
      return { coverImage: poster.poster }
    }
    return { coverImage: null }
  },

  instagram: async () => {
    const ogImage = getOpenGraph('image')
    return { coverImage: isValidImageUrl(ogImage) ? ogImage : null }
  },

  facebook: async () => {
    const ogImage = getOpenGraph('image')
    return { coverImage: isValidImageUrl(ogImage) ? ogImage : null }
  },
}

// ========== 通用Meta提取 ==========

function extractGeneralMetadata(): CoverExtractorResult {
  // 优先级：og:image → twitter:image → link[rel="image_src"] → 页面第一个大图
  const ogImage = getOpenGraph('image')
  if (isValidImageUrl(ogImage)) return { coverImage: ogImage }

  const twImage = getTwitterCard('image')
  if (isValidImageUrl(twImage)) return { coverImage: twImage }

  const imageSrc = document.querySelector('link[rel="image_src"]')?.getAttribute('href') || null
  if (isValidImageUrl(imageSrc)) return { coverImage: imageSrc }

  return { coverImage: null }
}

// ========== 标题提取 ==========

function extractTitle(): string {
  // og:title
  const ogTitle = getOpenGraph('title')
  if (ogTitle) return ogTitle.trim()

  // twitter:title
  const twTitle = getTwitterCard('title')
  if (twTitle) return twTitle.trim()

  // document.title（清理网站名）
  const siteName = getOpenGraph('site_name') || ''
  let title = document.title || ''
  if (siteName && title.includes(siteName)) {
    title = title.replace(new RegExp(`\\s*[\\|\\-–—]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '').trim()
    if (!title) title = document.title
  }

  return title.trim() || window.location.href
}

// ========== 完整元数据提取 ==========

async function extractMetadata(): Promise<ExtractedMetadata> {
  const platform = detectPlatform()
  let coverResult: CoverExtractorResult
  let title = ''

  // 平台专属提取
  if (platformCoverExtractors[platform]) {
    coverResult = await platformCoverExtractors[platform]()
    // 平台提取器可能返回标题（如抖音API、YouTube）
    title = coverResult.title || ''
  } else {
    // 通用提取：先尝试 og:image 等meta标签
    coverResult = extractGeneralMetadata()
  }

  // 如果平台提取器没返回标题，从DOM获取
  if (!title && platform === 'douyin') {
    // ★ 抖音：不可退回到 document.title（SPA切换后不更新）
    // extractDouyinCover 已有 DOM 兜底，这里再尝试一次
    title = extractDouyinTitleFromDOM()
  }
  if (!title) {
    title = extractTitle()
  }

  const siteName = getOpenGraph('site_name') || platform
  const description = getOpenGraph('description') || getMetaContent('meta[name="description"]') || ''

  // favicon
  let favicon: string | null = null
  const iconLink = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]')
  if (iconLink) {
    const href = iconLink.getAttribute('href')
    if (href) {
      favicon = href.startsWith('http') ? href : new URL(href, window.location.origin).href
    }
  }
  if (!favicon) {
    favicon = `${window.location.origin}/favicon.ico`
  }

  return {
    title,
    coverImage: coverResult.coverImage,
    coverStrategy: coverResult.coverImage ? 'url' : 'brand',
    platform,
    siteName,
    description: description.substring(0, 300),
    favicon,
  }
}

// ========== SPA URL变化检测与消息通信 ==========

let lastUrl = window.location.href
let lastTitle = document.title
let lastModalId = new URLSearchParams(window.location.search).get('modal_id') || ''

// 立即提取一次（首次加载）
function extractAndSend(trigger: string) {
  extractMetadata().then((metadata) => {
    console.log('[LinkChest] Metadata extracted (' + trigger + '):', {
      title: metadata.title?.substring(0, 40),
      cover: metadata.coverImage?.substring(0, 60),
      platform: metadata.platform,
    })
    lastTitle = metadata.title

    // 发送给 popup/background
    chrome.runtime.sendMessage({
      type: 'METADATA_EXTRACTED',
      payload: metadata,
    }).catch(() => {
      // popup 可能未打开，忽略错误
    })
  }).catch((err) => {
    console.error('[LinkChest] Extract failed:', err)
  })
}

// 首次提取（延迟确保SPA渲染完成）
setTimeout(() => extractAndSend('initial'), 1500)

// URL变化检测（定时器）
setInterval(() => {
  const currentUrl = window.location.href
  const currentModalId = new URLSearchParams(window.location.search).get('modal_id') || ''

  // 检测 URL 变化或 modal_id 变化（抖音 SPA 可能用 replaceState 不触发 URL 变化）
  if (currentUrl !== lastUrl || currentModalId !== lastModalId) {
    console.log('[LinkChest] URL/Modal changed:', { lastUrl, currentUrl, lastModalId, currentModalId })
    lastUrl = currentUrl
    lastModalId = currentModalId
    // 延迟提取，等待SPA渲染完成
    // 小红书 SPA 需要更长时间渲染（笔记详情页加载图片较慢）
    const delay = currentUrl.includes('xiaohongshu') ? 2500 : 1200
    setTimeout(() => extractAndSend('urlChange'), delay)
  }
}, 1000)

// title变化检测（MutationObserver监听 <title>）
const titleObserver = new MutationObserver(() => {
  const currentTitle = document.title
  if (currentTitle !== lastTitle && currentTitle) {
    console.log('[LinkChest] Title changed:', lastTitle, '→', currentTitle)
    extractAndSend('titleChange')
  }
})

const titleEl = document.querySelector('title')
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true })
}

// 监听 popup 请求
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_METADATA') {
    extractMetadata().then((metadata) => {
      sendResponse(metadata)
    }).catch(() => {
      sendResponse(null)
    })
    return true // 异步响应
  }
})

// 监听 WEB 端通过 postMessage 发送的请求
window.addEventListener('message', async (event) => {
  // 只处理来自同一窗口的消息
  if (event.source !== window) return

  const message = event.data
  if (message?.source !== 'linkchest-web') return

  if (message.type === 'FETCH_METADATA_FOR_URL') {
    const requestedUrl = message.url
    const currentUrl = window.location.href

    // 如果请求的 URL 是当前页面，直接提取
    if (requestedUrl === currentUrl || currentUrl.includes(requestedUrl) || requestedUrl.includes(currentUrl)) {
      try {
        const metadata = await extractMetadata()
        window.postMessage({
          source: 'linkchest-extension',
          requestId: message.requestId,
          type: 'METADATA_RESPONSE',
          data: {
            title: metadata.title,
            coverImage: metadata.coverImage,
            platform: metadata.platform,
          },
        }, '*')
      } catch {
        window.postMessage({
          source: 'linkchest-extension',
          requestId: message.requestId,
          type: 'METADATA_RESPONSE',
          data: null,
        }, '*')
      }
    }
  }
})
