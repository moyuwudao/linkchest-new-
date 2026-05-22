/**
 * 日志文件读取服务
 * 读取 PM2 输出的 JSON 日志文件，支持筛选、分页、排序
 */
import fs from 'fs'
import readline from 'readline'
import path from 'path'
import logger from '../lib/logger'

// PM2 日志目录（可通过环境变量覆盖）
const LOG_DIR = process.env.PM2_LOG_DIR || '/home/ubuntu/.pm2/logs'
const APP_NAME = process.env.PM2_APP_NAME || 'linkchest-api'

interface LogEntry {
  level: string
  time: string
  reqId?: string
  method?: string
  path?: string
  statusCode?: number
  duration?: number
  userId?: string
  errorCode?: string
  msg: string
  [key: string]: unknown
}

interface LogQueryOptions {
  level?: string        // info | warn | error | debug
  startTime?: string    // ISO 时间字符串
  endTime?: string      // ISO 时间字符串
  keyword?: string      // 关键词搜索
  errorCode?: string    // 错误码筛选
  path?: string         // 路径筛选
  page?: number
  pageSize?: number
}

interface LogQueryResult {
  entries: LogEntry[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取日志文件路径
 * 优先找 out 日志，找不到则找 err 日志
 */
function getLogFiles(): string[] {
  const files: string[] = []

  try {
    const outLog = path.join(LOG_DIR, `${APP_NAME}-out.log`)
    const errLog = path.join(LOG_DIR, `${APP_NAME}-error.log`)

    if (fs.existsSync(outLog)) files.push(outLog)
    if (fs.existsSync(errLog)) files.push(errLog)

    // 如果找不到，尝试列出目录下的日志文件
    if (files.length === 0 && fs.existsSync(LOG_DIR)) {
      const dirFiles = fs.readdirSync(LOG_DIR)
      const matching = dirFiles.filter(f => f.endsWith('.log'))
      matching.forEach(f => files.push(path.join(LOG_DIR, f)))
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'getLogFiles failed')
  }

  return files
}

/**
 * 从纯文本日志中提取时间戳
 * 支持格式：
 * - ISO: 2026-04-29T10:00:00.000Z
 * - 空格分隔: 2026-04-29 10:00:00
 * - Prisma 格式: 2026-04-29 10:00:00: prisma:error ...
 */
function extractTimeFromText(text: string): string | null {
  const trimmed = text.trim()

  // ISO / 空格分隔日期时间
  const isoMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/
  )
  if (isoMatch) return isoMatch[1]

  // Prisma 风格：YYYY-MM-DD HH:MM:SS: message
  const prismaMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}):\s/
  )
  if (prismaMatch) return prismaMatch[1]

  return null
}

/**
 * 解析单行日志
 */
function parseLogLine(line: string): LogEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // 尝试解析 JSON
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'object' && parsed !== null) {
      // pino 默认输出数字时间戳（毫秒），isoTime 输出 ISO 字符串
      // 统一转换为 ISO 字符串
      if (typeof parsed.time === 'number') {
        parsed.time = new Date(parsed.time).toISOString()
      }
      return parsed as LogEntry
    }
  } catch {
    // 不是 JSON，纯文本日志（如 Prisma 错误输出、堆栈跟踪等）
    // 尝试从文本中提取时间，避免使用当前查询时间
    const levelMatch = trimmed.match(/\b(error|warn|warning|info|debug)\b/i)
    const level = levelMatch ? levelMatch[1].toLowerCase() : 'info'
    const extractedTime = extractTimeFromText(trimmed)

    return {
      level: level === 'warning' ? 'warn' : level,
      time: extractedTime || new Date().toISOString(),
      msg: trimmed,
    }
  }

  return null
}

/**
 * 筛选日志条目
 */
function matchesFilter(entry: LogEntry, options: LogQueryOptions): boolean {
  if (options.level && entry.level !== options.level) return false
  if (options.errorCode && entry.errorCode !== options.errorCode) return false
  if (options.path && !entry.path?.includes(options.path)) return false
  if (options.keyword) {
    const kw = options.keyword.toLowerCase()
    const text = JSON.stringify(entry).toLowerCase()
    if (!text.includes(kw)) return false
  }

  if (options.startTime) {
    const entryTime = entry.time ? new Date(entry.time).getTime() : 0
    if (entryTime && entryTime < new Date(options.startTime).getTime()) return false
  }
  if (options.endTime) {
    const entryTime = entry.time ? new Date(entry.time).getTime() : Infinity
    if (entryTime > new Date(options.endTime).getTime()) return false
  }

  return true
}

/**
 * 查询日志
 * 支持从多个日志文件中读取，按时间倒序
 */
export async function queryLogs(options: LogQueryOptions = {}): Promise<LogQueryResult> {
  const page = options.page || 1
  const pageSize = Math.min(options.pageSize || 50, 200) // 最大 200 条

  const files = getLogFiles()
  if (files.length === 0) {
    return { entries: [], total: 0, page, pageSize }
  }

  const allEntries: LogEntry[] = []

  for (const filePath of files) {
    try {
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

      for await (const line of rl) {
        const entry = parseLogLine(line)
        if (entry && matchesFilter(entry, options)) {
          allEntries.push(entry)
        }
      }
    } catch (e) {
      logger.warn({ file: filePath, err: (e as Error).message }, 'read log file failed')
    }
  }

  // 按时间倒序
  allEntries.sort((a, b) => {
    const ta = a.time ? new Date(a.time).getTime() : 0
    const tb = b.time ? new Date(b.time).getTime() : 0
    return tb - ta
  })

  const total = allEntries.length
  const start = (page - 1) * pageSize
  const entries = allEntries.slice(start, start + pageSize)

  return { entries, total, page, pageSize }
}

/**
 * 获取日志文件列表（用于前端展示）
 */
export function getLogFileList(): Array<{ name: string; path: string; size: number; modified: Date }> {
  const files = getLogFiles()
  return files.map(fp => {
    const stat = fs.statSync(fp)
    return {
      name: path.basename(fp),
      path: fp,
      size: stat.size,
      modified: stat.mtime,
    }
  })
}
