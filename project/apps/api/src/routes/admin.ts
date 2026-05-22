/**
 * Admin API 路由
 * /api/admin/* - 运维管理后台接口
 * 所有路由受 adminAuth 中间件保护
 */
import { Router } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { getMetrics, getMetricsTimeline, getShareStats } from '../services/metrics'
import { getMetadataStats } from '../services/metadata'
import { queryLogs, getLogFileList } from '../services/logReader'
import { getAllTierConfigs, createTierConfig, updateTierConfig, deleteTierConfig, clearTierConfigCache, syncTierConfigs, getQuotaConfig } from '../services/tierConfig'
import { getMetricsText } from '../services/prom-metrics'
import { TierErrorCodes, errorResponse, CommonErrorCodes, AuthErrorCodes } from '../lib/errorCodes'

const router = Router()

// ===== 管理员身份校验 =====

router.get('/me', (req, res) => {
  const userId = req.userId
  if (!userId) {
    return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
  }
  res.json({ isAdmin: true, userId })
})

// ===== Dashboard 概览 =====

router.get('/dashboard', async (req, res) => {
  try {
    // Redis 指标独立包装，任一失败不影响其他数据
    const [metrics1h, metrics24h] = await Promise.all([
      getMetrics(60).catch(() => ({ totalRequests: 0, totalErrors: 0, avgDuration: 0, errorRate: 0, statusDistribution: {} })),
      getMetrics(1440).catch(() => ({ totalRequests: 0, totalErrors: 0, avgDuration: 0, errorRate: 0, statusDistribution: {} })),
    ])
    const timeline = await getMetricsTimeline(60).catch(() => [])
    const shareStats1h = await getShareStats(60).catch(() => ({ cacheHits: 0, cacheMisses: 0, cacheHitRate: 0, totalRequests: 0, avgDuration: 0 }))
    const shareStats24h = await getShareStats(1440).catch(() => ({ cacheHits: 0, cacheMisses: 0, cacheHitRate: 0, totalRequests: 0, avgDuration: 0 }))

    const [
      recentErrors,
      recentAlerts,
      errorDistribution,
    ] = await Promise.all([
      prisma.errorEvent.findMany({
        where: { status: { not: 'fixed' } },
        orderBy: { lastAt: 'desc' },
        take: 10,
        select: {
          id: true,
          errorCode: true,
          message: true,
          count: true,
          status: true,
          firstAt: true,
          lastAt: true,
        },
      }),
      prisma.alertHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          ruleName: true,
          priority: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.errorEvent.groupBy({
        by: ['errorCode'],
        where: { status: { not: 'fixed' } },
        _sum: { count: true },
        orderBy: { _sum: { count: 'desc' } },
        take: 10,
      }),
    ])

    // 系统资源信息（Node.js 运行时）
    const os = await import('os')
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const loadAvg = os.loadavg()

    res.json({
      overview: {
        requests1h: metrics1h.totalRequests,
        requests24h: metrics24h.totalRequests,
        errorRate1h: metrics1h.errorRate,
        errorRate24h: metrics24h.errorRate,
        avgDuration1h: metrics1h.avgDuration,
        avgDuration24h: metrics24h.avgDuration,
      },
      timeline,
      recentErrors,
      recentAlerts,
      errorDistribution: errorDistribution.map(e => ({
        errorCode: e.errorCode || 'UNKNOWN',
        count: e._sum.count || 0,
      })),
      shareStats: {
        cacheHitRate1h: shareStats1h.cacheHitRate,
        cacheHitRate24h: shareStats24h.cacheHitRate,
        shareRequests1h: shareStats1h.totalRequests,
        shareRequests24h: shareStats24h.totalRequests,
        shareAvgDuration1h: shareStats1h.avgDuration,
        shareAvgDuration24h: shareStats24h.avgDuration,
      },
      system: {
        cpuCores: os.cpus().length,
        loadAvg1m: loadAvg[0],
        loadAvg5m: loadAvg[1],
        loadAvg15m: loadAvg[2],
        totalMemoryMB: Math.round(totalMem / 1024 / 1024),
        usedMemoryMB: Math.round(usedMem / 1024 / 1024),
        freeMemoryMB: Math.round(freeMem / 1024 / 1024),
        memoryUsagePercent: totalMem > 0 ? usedMem / totalMem : 0,
        nodeHeapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeHeapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        nodeRssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin dashboard failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== 日志查询 =====

router.get('/logs', async (req, res) => {
  try {
    const level = req.query.level as string | undefined
    const startTime = req.query.startTime as string | undefined
    const endTime = req.query.endTime as string | undefined
    const keyword = req.query.keyword as string | undefined
    const errorCode = req.query.errorCode as string | undefined
    const path = req.query.path as string | undefined
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50

    const result = await queryLogs({
      level,
      startTime,
      endTime,
      keyword,
      errorCode,
      path,
      page,
      pageSize,
    })

    res.json(result)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin logs query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.get('/logs/files', async (req, res) => {
  try {
    const files = getLogFileList()
    res.json({ files })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin log files failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== 错误事件管理 =====

router.get('/errors', async (req, res) => {
  try {
    const status = req.query.status as string | undefined
    const errorCode = req.query.errorCode as string | undefined
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20
    const sortBy = (req.query.sortBy as string) || 'lastAt'
    const sortOrder = (req.query.sortOrder as string) || 'desc'

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (errorCode) where.errorCode = errorCode

    const [items, total] = await Promise.all([
      prisma.errorEvent.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.errorEvent.count({ where }),
    ])

    res.json({ items, total, page, pageSize })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin errors query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.patch('/errors/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['pending', 'confirmed', 'fixed', 'ignored'].includes(status)) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const updated = await prisma.errorEvent.update({
      where: { id },
      data: { status },
    })

    res.json(updated)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin error update failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.get('/errors/:id', async (req, res) => {
  try {
    const { id } = req.params
    const item = await prisma.errorEvent.findUnique({
      where: { id },
    })
    if (!item) {
      return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND)
    }
    res.json(item)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin error detail failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== 实时指标 =====

router.get('/metrics', async (req, res) => {
  try {
    const windowMinutes = parseInt(req.query.window as string, 10) || 60
    const metrics = await getMetrics(windowMinutes)
    const timeline = await getMetricsTimeline(Math.min(windowMinutes, 120))

    res.json({
      windowMinutes,
      ...metrics,
      timeline,
    })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin metrics failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 元数据抓取监控统计
router.get('/metadata-stats', (_req, res) => {
  try {
    const stats = getMetadataStats()
    res.json(stats)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin metadata-stats failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== 告警规则管理 =====

router.get('/alerts', async (req, res) => {
  try {
    const rules = await prisma.alertRule.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json({ rules })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin alerts query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.post('/alerts', async (req, res) => {
  try {
    const { name, type, conditionConfig, channels, enabled, cooldownMinutes, priority, silentStart, silentEnd } = req.body

    if (!name || !type || !conditionConfig) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

      const rule = await prisma.alertRule.create({
        data: {
          name,
          type,
          conditionConfig: conditionConfig as Prisma.InputJsonValue,
          channels: (channels || {}) as Prisma.InputJsonValue,
          enabled: enabled ?? true,
          cooldownMinutes: cooldownMinutes ?? 30,
          priority: priority || 'P1',
          silentStart: silentStart || null,
          silentEnd: silentEnd || null,
        },
      })

    res.status(201).json(rule)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin alert create failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.patch('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, type, conditionConfig, channels, enabled, cooldownMinutes, priority, silentStart, silentEnd } = req.body

    const updateData: Prisma.AlertRuleUpdateInput = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (conditionConfig !== undefined) updateData.conditionConfig = conditionConfig as Prisma.InputJsonValue
    if (channels !== undefined) updateData.channels = channels as Prisma.InputJsonValue
    if (enabled !== undefined) updateData.enabled = enabled
    if (cooldownMinutes !== undefined) updateData.cooldownMinutes = cooldownMinutes
    if (priority !== undefined) updateData.priority = priority
    if (silentStart !== undefined) updateData.silentStart = silentStart || null
    if (silentEnd !== undefined) updateData.silentEnd = silentEnd || null

    const updated = await prisma.alertRule.update({
      where: { id },
      data: updateData,
    })

    res.json(updated)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin alert update failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.delete('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.alertRule.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin alert delete failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 告警历史
router.get('/alerts/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20
    const ruleId = req.query.ruleId as string | undefined

    const where: Record<string, unknown> = {}
    if (ruleId) where.ruleId = ruleId

    const [items, total] = await Promise.all([
      prisma.alertHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { rule: { select: { name: true, type: true } } },
      }),
      prisma.alertHistory.count({ where }),
    ])

    res.json({ items, total, page, pageSize })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin alert history failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== 用户管理 =====

router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20
    const keyword = (req.query.keyword as string) || ''
    const sortBy = (req.query.sortBy as string) || 'createdAt'
    const sortOrder = (req.query.sortOrder as string) || 'desc'

    const where: Prisma.UserWhereInput = {}
    if (keyword) {
      where.OR = [
        { email: { contains: keyword, mode: 'insensitive' } },
        { nickname: { contains: keyword, mode: 'insensitive' } },
        { username: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          nickname: true,
          avatar: true,
          authSource: true,
          lang: true,
          userTier: true,
          heavyExpiresAt: true,
          superExpiresAt: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              collections: true,
              tags: true,
              lists: true,
              shares: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    const formattedItems = items.map(user => ({
      ...user,
      collectionCount: user._count.collections,
      tagCount: user._count.tags,
      listCount: user._count.lists,
      shareCount: user._count.shares,
    }))

    res.json({ items: formattedItems, total, page, pageSize })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin users query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        nickname: true,
        avatar: true,
        authSource: true,
        lang: true,
        userTier: true,
        status: true,
        bannedAt: true,
        bannedReason: true,
        heavyExpiresAt: true,
        superExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        loginAttempts: true,
        lockedUntil: true,
        _count: {
          select: {
            collections: true,
            tags: true,
            lists: true,
            shares: true,
            shareViews: true,
            shareSubscriptions: true,
          },
        },
      },
    })

    if (!user) {
      return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND)
    }

    // 获取用户当前等级的配额限制
    const quotaLimits = await getQuotaConfig(user.userTier as any).catch(() => null)

    res.json({
      ...user,
      collectionCount: user._count.collections,
      tagCount: user._count.tags,
      listCount: user._count.lists,
      shareCount: user._count.shares,
      shareViewCount: user._count.shareViews,
      shareSubscriptionCount: user._count.shareSubscriptions,
      quotaLimits,
    })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin user detail failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, userTier, bannedReason } = req.body

    const updateData: Prisma.UserUpdateInput = {}
    if (status !== undefined) {
      if (!['active', 'suspended', 'banned'].includes(status)) {
        return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
      }
      updateData.status = status
      if (status === 'banned') {
        updateData.bannedAt = new Date()
      } else {
        updateData.bannedAt = null
        updateData.bannedReason = null
      }
    }
    if (userTier !== undefined) {
      if (!['medium', 'heavy', 'super'].includes(userTier)) {
        return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
      }
      updateData.userTier = userTier
    }
    if (bannedReason !== undefined) {
      updateData.bannedReason = bannedReason || null
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        status: true,
        userTier: true,
        bannedAt: true,
        bannedReason: true,
      },
    })

    res.json(updated)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin user update failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 测试推送
router.post('/alerts/:id/test', async (req, res) => {
  try {
    const { id } = req.params
    const rule = await prisma.alertRule.findUnique({ where: { id } })
    if (!rule) {
      return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND)
    }

    const channels = rule.channels as Record<string, string[]>
    const priority = rule.priority || 'P1'
    const ruleName = rule.name
    const message = `【测试推送】规则「${ruleName}」告警通道测试，优先级 ${priority}`
    const results: string[] = []

    // 飞书
    const feishuUrl = channels.feishu?.[0] || process.env.FEISHU_WEBHOOK_URL || ''
    if (feishuUrl) {
      try {
        await fetch(feishuUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'interactive',
            card: {
              config: { wide_screen_mode: true },
              header: {
                title: { tag: 'plain_text', content: `🧪 LinkChest 告警测试 [${priority}]` },
                template: priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : priority === 'P2' ? 'yellow' : 'blue',
              },
              elements: [{
                tag: 'div',
                text: { tag: 'lark_md', content: `**规则：** ${ruleName}\n**详情：** ${message}\n**时间：** ${new Date().toLocaleString('zh-CN')}` },
              }],
            },
          }),
        })
        results.push('feishu')
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'test feishu push failed')
      }
    }

    // 企业微信
    const wecomUrl = channels.wecom?.[0] || process.env.WECOM_WEBHOOK_URL || ''
    if (wecomUrl) {
      try {
        await fetch(wecomUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
              content: `## 🧪 LinkChest 告警测试 [${priority}]\n>**规则：** ${ruleName}\n>**详情：** ${message}\n>**时间：** ${new Date().toLocaleString('zh-CN')}`,
            },
          }),
        })
        results.push('wecom')
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'test wecom push failed')
      }
    }

    // 邮件
    const ALERT_EMAILS = (process.env.ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)
    const emails = channels.email?.length ? channels.email : ALERT_EMAILS
    if (emails.length > 0) {
      try {
        const { sendAlertEmail } = await import('../services/ses')
        await sendAlertEmail(emails, `[测试] ${ruleName}`, message, priority)
        results.push('email')
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'test email push failed')
      }
    }

    if (results.length === 0) {
      res.json({ success: false, message: '无可用推送通道（未配置飞书/企微/邮箱）' })
      return
    }

    res.json({ success: true, message: `测试推送已发送至: ${results.join(', ')}`, channels: results })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin alert test failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== 等级配置管理 =====

router.get('/tiers', async (_req, res) => {
  try {
    const configs = await getAllTierConfigs()
    res.json({ data: configs })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin tiers query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 等级分布统计（必须放在 /tiers/:id 之前，避免被 Express 参数路由拦截）
router.get('/tiers/stats', async (_req, res) => {
  try {
    const [tierDistribution, totalUsers, activeSubscriptions, expiringSoon, tierConfigs] = await Promise.all([
      prisma.user.groupBy({
        by: ['userTier'],
        _count: { id: true },
      }),
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({
        where: {
          status: 'active',
          expiresAt: { lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      getAllTierConfigs(),
    ])

    const distribution = tierDistribution.map(d => {
      const config = tierConfigs.find(c => c.key === d.userTier)
      return {
        tier: d.userTier,
        nameZh: config?.nameZh || d.userTier,
        nameEn: config?.nameEn || d.userTier,
        count: d._count.id,
        percentage: totalUsers > 0 ? Math.round((d._count.id / totalUsers) * 1000) / 10 : 0,
      }
    })

    const userDistribution: Record<string, number> = {}
    for (const d of distribution) {
      userDistribution[d.tier] = d.count
    }

    res.json({
      data: {
        totalConfigs: tierConfigs.length,
        activeConfigs: tierConfigs.filter(c => c.isActive).length,
        userDistribution,
        totalUsers,
        activeSubscriptions,
        expiringSoon,
      },
    })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin tier stats failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.post('/tiers', async (req, res) => {
  try {
    const { key, nameZh, nameEn, description, sortOrder, isActive, quotaConfig, pricingConfig, benefits } = req.body

    if (!key || !nameZh || !nameEn || !quotaConfig) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const tier = await createTierConfig({
      key,
      nameZh,
      nameEn,
      description,
      sortOrder,
      isActive,
      quotaConfig,
      pricingConfig: pricingConfig || null,
      benefits: benefits || [],
    })

    res.status(201).json(tier)
  } catch (e) {
    const message = (e as Error).message
    logger.error({ err: message }, 'admin tier create failed')
    if (message === 'TIER_KEY_EXISTS') {
      return errorResponse(res, 400, TierErrorCodes.TIER_KEY_EXISTS)
    }
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.patch('/tiers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nameZh, nameEn, description, sortOrder, isActive, quotaConfig, pricingConfig, benefits } = req.body

    const updateData: Parameters<typeof updateTierConfig>[1] = {}
    if (nameZh !== undefined) updateData.nameZh = nameZh
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (description !== undefined) updateData.description = description
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive
    if (quotaConfig !== undefined) updateData.quotaConfig = quotaConfig
    if (pricingConfig !== undefined) updateData.pricingConfig = pricingConfig
    if (benefits !== undefined) updateData.benefits = benefits

    const updated = await updateTierConfig(id, updateData)
    res.json(updated)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin tier update failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

router.delete('/tiers/:id', async (req, res) => {
  try {
    const { id } = req.params
    await deleteTierConfig(id)
    res.json({ success: true })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin tier delete failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 手动同步 tier 配置（将硬编码配置覆盖到数据库）
router.post('/tiers/sync', async (_req, res) => {
  try {
    const result = await syncTierConfigs()
    res.json({ success: true, data: result })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin tier sync failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== Prometheus /metrics 端点 =====
// 注意：生产环境应通过反向代理限制访问（如只允许 Prometheus IP）
router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getMetricsText()
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.send(metrics)
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'metrics endpoint failed')
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

// ===== 邀请码监控 =====

// 邀请码总览统计
router.get('/referrals/stats', async (_req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalCodes,
      activeCodes,
      totalUses,
      todayUses,
      totalRewarded,
      topReferrers,
    ] = await Promise.all([
      prisma.referralCode.count(),
      prisma.referralCode.count({ where: { isActive: true } }),
      prisma.referralUse.count(),
      prisma.referralUse.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.referralUse.count({ where: { rewardTriggered: true } }),
      prisma.referralCode.findMany({
        where: { useCount: { gt: 0 } },
        orderBy: { useCount: 'desc' },
        take: 10,
        select: {
          id: true,
          code: true,
          useCount: true,
          maxUses: true,
          isActive: true,
          createdAt: true,
          user: { select: { nickname: true, email: true } },
        },
      }),
    ])

    const codesWithUses = await prisma.referralCode.count({ where: { useCount: { gt: 0 } } })
    const conversionRate = totalCodes > 0 ? Math.round((codesWithUses / totalCodes) * 1000) / 10 : 0

    res.json({
      data: {
        totalCodes,
        activeCodes,
        totalUses,
        todayUses,
        totalRewarded,
        conversionRate,
        topReferrers: topReferrers.map(r => ({
          id: r.id,
          code: r.code,
          useCount: r.useCount,
          maxUses: r.maxUses,
          isActive: r.isActive,
          createdAt: r.createdAt,
          referrerNickname: r.user?.nickname || null,
          referrerEmail: r.user?.email || null,
        })),
      },
    })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin referral stats failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 邀请码列表
router.get('/referrals/codes', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20
    const keyword = (req.query.keyword as string) || ''
    const sortBy = (req.query.sortBy as string) || 'createdAt'
    const sortOrder = (req.query.sortOrder as string) || 'desc'

    const where: Prisma.ReferralCodeWhereInput = {}
    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { user: { email: { contains: keyword, mode: 'insensitive' } } },
        { user: { nickname: { contains: keyword, mode: 'insensitive' } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.referralCode.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          code: true,
          maxUses: true,
          useCount: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, nickname: true, email: true } },
          _count: { select: { uses: true } },
        },
      }),
      prisma.referralCode.count({ where }),
    ])

    res.json({
      items: items.map(item => ({
        ...item,
        totalUses: item._count.uses,
      })),
      total,
      page,
      pageSize,
    })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin referral codes query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 邀请使用记录列表
router.get('/referrals/uses', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20
    const code = (req.query.code as string) || ''
    const status = (req.query.status as string) || ''
    const sortBy = (req.query.sortBy as string) || 'createdAt'
    const sortOrder = (req.query.sortOrder as string) || 'desc'

    const where: Prisma.ReferralUseWhereInput = {}
    if (code) {
      where.referralCode = { code: { contains: code, mode: 'insensitive' } }
    }
    if (status) {
      where.status = status
    }

    const [items, total] = await Promise.all([
      prisma.referralUse.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          rewardType: true,
          rewardValue: true,
          rewardGivenAt: true,
          useIp: true,
          userAgent: true,
          createdAt: true,
          updatedAt: true,
          referralCode: { select: { code: true, user: { select: { nickname: true, email: true } } } },
          referee: { select: { id: true, nickname: true, email: true, createdAt: true } },
        },
      }),
      prisma.referralUse.count({ where }),
    ])

    res.json({ items, total, page, pageSize })
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin referral uses query failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 禁用/启用邀请码
router.patch('/referrals/codes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { isActive, maxUses, expiresAt } = req.body

    const updateData: Prisma.ReferralCodeUpdateInput = {}
    if (isActive !== undefined) updateData.isActive = isActive
    if (maxUses !== undefined) updateData.maxUses = maxUses
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

    const updated = await prisma.referralCode.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        maxUses: true,
        useCount: true,
        expiresAt: true,
        isActive: true,
        updatedAt: true,
        user: { select: { nickname: true, email: true } },
      },
    })

    logger.info({ referralCodeId: id, isActive, maxUses }, '管理员更新邀请码')
    res.json(updated)
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'admin referral code update failed')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

export default router
