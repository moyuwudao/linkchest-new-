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
 * 获取日志文件路径（异步版本）
 * 优先找 out 日志，找不到则找 err 日志
 */
async function getLogFiles(): Promise<string[]> {
  const files: string[] = []

  try {
    const outLog = path.join(LOG_DIR, `${APP_NAME}-out.log`)
    const errLog = path.join(LOG_DIR, `${APP_NAME}-error.log`)

    const [outExists, errExists] = await Promise.all([
      fs.promises.access(outLog).then(() => true).catch(() => false),
      fs.promises.access(errLog).then(() => true).catch(() => false),
    ])

    if (outExists) files.push(outLog)
    if (errExists) files.push(errLog)

    // 如果找不到，尝试列出目录下的日志文件
    if (files.length === 0) {
      try {
        const dirFiles = await fs.promises.readdir(LOG_DIR)
        const matching = dirFiles.filter(f => f.endsWith('.log'))
        matching.forEach(f => files.push(path.join(LOG_DIR, f)))
      } catch {
        // 目录不存在或无法读取
      }
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
 * 从文件末尾反向读取日志行（异步版本，避免阻塞事件循环）
 * 按块读取，从后往前收集匹配的行，直到收集够数量或超时
 */
async function readLogsReverse(
  filePath: string,
  options: LogQueryOptions,
  needed: number,
  timeoutMs: number
): Promise<LogEntry[]> {
  const entries: LogEntry[] = []
  const startTime = Date.now()

  const stat = await fs.promises.stat(filePath)
  const fileSize = stat.size
  if (fileSize === 0) return entries

  const chunkSize = 64 * 1024 // 64KB 一块
  let position = fileSize
  let leftover = ''

  while (position > 0 && entries.length < needed) {
    // 超时检查
    if (Date.now() - startTime > timeoutMs) {
      logger.warn({ file: filePath, elapsed: Date.now() - startTime }, 'log read timeout')
      break
    }

    const readSize = Math.min(chunkSize, position)
    position -= readSize

    const buffer = Buffer.alloc(readSize)
    const fd = await fs.promises.open(filePath, 'r')
    await fd.read(buffer, 0, readSize, position)
    await fd.close()

    const chunk = buffer.toString('utf8') + leftover
    const lines = chunk.split('\n')

    // 最后一块可能不完整，保留第一行给下一次
    leftover = lines.shift() || ''

    // 从后往前遍历行（因为 chunk 是从文件末尾读的）
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      if (!line.trim()) continue

      const entry = parseLogLine(line)
      if (entry && matchesFilter(entry, options)) {
        entries.push(entry)
        if (entries.length >= needed) break
      }
    }
  }

  // 处理最后剩下的内容
  if (leftover.trim() && entries.length < needed) {
    const entry = parseLogLine(leftover)
    if (entry && matchesFilter(entry, options)) {
      entries.push(entry)
    }
  }

  return entries
}

/**
 * 查询日志
 * 从文件末尾反向读取，收集够数量即停止，避免全量扫描
 */
export async function queryLogs(options: LogQueryOptions = {}): Promise<LogQueryResult> {
  const page = options.page || 1
  const pageSize = Math.min(options.pageSize || 50, 200) // 最大 200 条
  const timeoutMs = 3000 // 单文件读取超时 3 秒

  const files = await getLogFiles()
  if (files.length === 0) {
    return { entries: [], total: 0, page, pageSize }
  }

  // 计算需要收集的总条数（考虑到分页）
  const neededTotal = page * pageSize
  const allEntries: LogEntry[] = []

  // 按文件修改时间倒序读取（最新的文件优先）
  const filesWithMtime = await Promise.all(
    files.map(async fp => ({
      path: fp,
      mtime: (await fs.promises.stat(fp)).mtime.getTime(),
    }))
  )
  filesWithMtime.sort((a, b) => b.mtime - a.mtime)

  for (const file of filesWithMtime) {
    if (allEntries.length >= neededTotal) break

    const remaining = neededTotal - allEntries.length
    try {
      const entries = await readLogsReverse(file.path, options, remaining, timeoutMs)
      allEntries.push(...entries)
    } catch (e) {
      logger.warn({ file: file.path, err: (e as Error).message }, 'read log file failed')
    }
  }

  // 按时间倒序排序（不同文件的日志需要合并排序）
  allEntries.sort((a, b) => {
    const ta = a.time ? new Date(a.time).getTime() : 0
    const tb = b.time ? new Date(b.time).getTime() : 0
    return tb - ta
  })

  // 分页切片
  const start = (page - 1) * pageSize
  const entries = allEntries.slice(start, start + pageSize)

  // total 返回已扫描到的数量（不是精确总数，避免全量计数）
  return { entries, total: allEntries.length, page, pageSize }
}

/**
 * 获取日志文件列表（用于前端展示，异步版本）
 */
export async function getLogFileList(): Promise<Array<{ name: string; path: string; size: number; modified: Date }>> {
  const files = await getLogFiles()
  const stats = await Promise.all(
    files.map(async fp => {
      const stat = await fs.promises.stat(fp)
      return {
        name: path.basename(fp),
        path: fp,
        size: stat.size,
        modified: stat.mtime,
      }
    })
  )
  return stats
}
