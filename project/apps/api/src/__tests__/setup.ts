/**
 * Jest 测试全局设置
 * - 设置测试环境变量
 * - 提供测试辅助函数
 */

// 强制测试环境
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production'
process.env.JWT_EXPIRES_IN = '1h'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://linkchest:linkchest@localhost:5432/linkchest_test?schema=public'
process.env.REDIS_URL = process.env.REDIS_URL || ''
process.env.SHARE_BASE_URL = 'http://localhost:3001'

// 导入并初始化 Prisma（测试环境不会自动连接）
import prisma from '../lib/prisma'

/**
 * 清理测试数据辅助函数
 * 按依赖关系逆序清空相关表
 */
export async function cleanupTestData() {
  await prisma.$transaction([
    prisma.shareItem.deleteMany(),
    prisma.share.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.list.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

/**
 * 创建测试用户
 */
export async function createTestUser(data: {
  email: string
  password?: string
  name?: string
  userTier?: string
}) {
  const bcrypt = require('bcryptjs')
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await bcrypt.hash(data.password || 'Test1234!', 10),
      nickname: data.name || 'Test User',
      userTier: (data.userTier || 'medium') as any,
      status: 'active',
    },
  })
}

/**
 * 生成测试 JWT Token
 */
export function generateTestToken(userId: string): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  })
}

/**
 * 生成认证请求头
 */
export function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateTestToken(userId)}` }
}

// 全局 afterAll：断开数据库连接
afterAll(async () => {
  await prisma.$disconnect()
})
