/**
 * 带超时和自动降级的 fetch 封装
 * 解决外部 API 调用无超时导致的请求挂死问题
 */
import logger from './logger'

interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number
  fallbackValue?: unknown
  onTimeout?: () => void
}

/**
 * 带超时的 fetch 封装
 * @param url 请求地址
 * @param options fetch 选项，支持 timeoutMs（默认 10 秒）
 * @returns Response 或 fallbackValue
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response | unknown> {
  const { timeoutMs = 10000, fallbackValue, onTimeout, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    onTimeout?.()
    logger.warn({ url, timeoutMs }, 'fetch timeout, aborted')
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      logger.warn({ url, timeoutMs }, 'fetch aborted due to timeout')
      if (fallbackValue !== undefined) return fallbackValue
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`)
    }
    throw err
  }
}

/**
 * 带超时的 JSON fetch 封装
 * 自动解析 JSON，超时返回 fallbackValue
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T | unknown> {
  const response = await fetchWithTimeout(url, options)
  if (response instanceof Response) {
    return response.json() as Promise<T>
  }
  return response
}
