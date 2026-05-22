/**
 * 结构化日志封装 - 基于 pino
 * 替换 console.log，输出 JSON 格式，PM2 原生兼容
 */
import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  base: {
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label }
    },
  },
  // 开发环境使用 pretty 打印
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid',
          },
        },
      }),
})

/** 生成唯一请求 ID */
export function generateReqId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * 创建带 reqId 的子 logger
 * 用法：const child = logger.child({ reqId: generateReqId() })
 */
export default logger
