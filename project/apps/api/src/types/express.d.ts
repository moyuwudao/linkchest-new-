/**
 * Express 请求类型扩展
 * 为 adminAuth 中间件附加的 userId 提供类型声明
 */

declare global {
  namespace Express {
    interface Request {
      /** adminAuth / optionalAdminAuth 中间件附加的管理员 userId */
      userId?: string
    }
  }
}

export {}
