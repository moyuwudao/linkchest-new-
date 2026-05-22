import { Router } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { SUPPORTED_PLATFORMS } from '../services/platforms'
import { StatsErrorCodes, errorResponse } from '../lib/errorCodes'

const router = Router()

// 获取平台统计
router.get('/platforms', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const result = await prisma.collection.groupBy({
      by: ['platform'],
      where: { userId },
      _count: { platform: true },
      orderBy: { _count: { platform: 'desc' } },
    })

    // 添加平台名称和颜色
    const data = result.map(item => {
      const config = SUPPORTED_PLATFORMS.find(p => p.key === item.platform)
      return {
        platform: item.platform,
        name: config?.name || item.platform,
        color: config?.color || '#999999',
        count: item._count.platform,
      }
    })

    res.json({ data })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取平台统计错误')
    errorResponse(res, 500, StatsErrorCodes.STATS_PLATFORM_FETCH_FAILED)
  }
})

// 获取用户总览统计
router.get('/overview', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const [collectionCount, listCount, shareCount, tagCount, shareViewAgg] = await Promise.all([
      prisma.collection.count({ where: { userId, deletedAt: null } }),
      prisma.list.count({ where: { userId } }),
      prisma.share.count({ where: { userId } }),
      prisma.tag.count({ where: { userId } }),
      prisma.share.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    ])

    res.json({
      data: {
        collectionCount,
        listCount,
        shareCount,
        tagCount,
        shareViewCount: shareViewAgg._sum.viewCount || 0,
      }
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取总览统计错误')
    errorResponse(res, 500, StatsErrorCodes.STATS_OVERVIEW_FETCH_FAILED)
  }
})

export default router
