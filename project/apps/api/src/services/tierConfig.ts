import prisma from '../lib/prisma'
import { QUOTA_CONFIG, TIER_DISPLAY_NAMES, PRICING_CONFIG, type UserTier, type QuotaLimits, type PlanPricing } from '../lib/config'
import logger from '../lib/logger'

export interface TierConfig {
  id: string
  key: string
  nameZh: string
  nameEn: string
  description: string | null
  sortOrder: number
  isActive: boolean
  quotaConfig: QuotaLimits
  pricingConfig: PlanPricing | null
  benefits: string[]
  createdAt: Date
  updatedAt: Date
}

let cache: TierConfig[] | null = null
let cacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5分钟

// v3.0 默认权益配置（fallback 场景）
const DEFAULT_BENEFITS: Record<UserTier, string[]> = {
  medium: ['无限收藏、标签、分组', '批量操作（全员开放）', '导出 HTML + CSV'],
  heavy:  ['分享密码保护', '分享访问统计（基础）'],
  super:  ['专业版所有功能'],
}

function buildFallbackConfigs(): TierConfig[] {
  return (Object.keys(QUOTA_CONFIG) as UserTier[]).map((key, idx) => ({
    id: `fallback-${key}`,
    key,
    nameZh: TIER_DISPLAY_NAMES[key].nameZh,
    nameEn: TIER_DISPLAY_NAMES[key].nameEn,
    description: key === 'super' ? '专业版所有功能' : null,
    sortOrder: idx,
    isActive: true,
    quotaConfig: QUOTA_CONFIG[key],
    pricingConfig: (PRICING_CONFIG as Record<string, PlanPricing | undefined>)[key] || null,
    benefits: DEFAULT_BENEFITS[key] || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

/**
 * 自动将硬编码配置写入数据库（仅在表为空时调用）
 */
async function seedTierConfigs(): Promise<TierConfig[]> {
  const configs = buildFallbackConfigs()
  for (const c of configs) {
    try {
      await prisma.tierConfig.create({
        data: {
          key: c.key,
          nameZh: c.nameZh,
          nameEn: c.nameEn,
          description: c.description,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          quotaConfig: c.quotaConfig as any,
          pricingConfig: c.pricingConfig
            ? (c.pricingConfig as any)
            : null,
          benefits: c.benefits,
        },
      })
    } catch (err) {
      logger.warn({ err: (err as Error).message, key: c.key }, 'seed tier config failed')
    }
  }
  const rows = await prisma.tierConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  return rows.map(rowToTierConfig)
}

/**
 * 初始化 tier 配置（仅在数据库为空时写入硬编码默认值）
 * 管理后台是配置唯一来源，此函数不会覆盖已有数据
 *
 * v4.1: 删除 cny 补齐逻辑（v4.1 改为单 yearly 字段，无 monthly）
 *       历史记录若仍含 monthly，在读取时由 rowToTierConfig 过滤
 */
export async function syncTierConfigs(): Promise<{ updated: number; created: number }> {
  const configs = buildFallbackConfigs()
  let updated = 0
  let created = 0

  for (const c of configs) {
    try {
      const existing = await prisma.tierConfig.findUnique({ where: { key: c.key } })
      if (existing) {
        // v4.1: 不再主动同步已有数据（管理后台为唯一来源）
        // 兼容：如果数据库记录里 monthly 字段残留（v4.1 之前的数据），下次启动时会被过滤掉
        continue
      } else {
        await prisma.tierConfig.create({
          data: {
            key: c.key,
            nameZh: c.nameZh,
            nameEn: c.nameEn,
            description: c.description,
            sortOrder: c.sortOrder,
            isActive: c.isActive,
            quotaConfig: c.quotaConfig as any,
            pricingConfig: c.pricingConfig ? (c.pricingConfig as any) : null,
            benefits: c.benefits,
          },
        })
        created++
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key: c.key }, 'sync tier config failed')
    }
  }

  if (created > 0) {
    clearTierConfigCache()
    logger.info({ created }, 'tier configs synced')
  }
  return { updated, created }
}

function rowToTierConfig(row: {
  id: string
  key: string
  nameZh: string
  nameEn: string
  description: string | null
  sortOrder: number
  isActive: boolean
  quotaConfig: unknown
  pricingConfig: unknown
  benefits: unknown
  createdAt: Date
  updatedAt: Date
}): TierConfig {
  // v4.1: 防御性过滤 monthly（历史 v3.x 数据库记录可能仍含 monthly 字段）
  //       已迁移的数据库不会含 monthly，但代码层做最后一道防线
  const rawPricing = (row.pricingConfig as PlanPricing | null) || null
  let cleanPricing: PlanPricing | null = null
  if (rawPricing) {
    // 显式丢弃 monthly 字段（v4.1 起不再支持）
    const { monthly: _omit, ...rest } = rawPricing as PlanPricing & { monthly?: unknown }
    void _omit
    cleanPricing = rest as PlanPricing
  }

  return {
    ...row,
    quotaConfig: row.quotaConfig as QuotaLimits,
    pricingConfig: cleanPricing,
    benefits: (row.benefits as string[]) || [],
  }
}

/**
 * 获取所有等级配置（带内存缓存）
 */
export async function getAllTierConfigs(): Promise<TierConfig[]> {
  const now = Date.now()
  if (cache && cacheTime + CACHE_TTL_MS > now) {
    return cache
  }

  try {
    const rows = await prisma.tierConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    // 数据库表存在但无数据时，自动写入硬编码配置
    if (rows.length === 0) {
      const seeded = await seedTierConfigs()
      cache = seeded
      cacheTime = now
      return seeded
    }
    cache = rows.map(rowToTierConfig)
    cacheTime = now
    return cache
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '从数据库读取等级配置失败，降级到硬编码')
    const fallback = buildFallbackConfigs()
    cache = fallback
    cacheTime = now
    return fallback
  }
}

/**
 * 获取单个等级配置
 */
export async function getTierConfig(key: UserTier): Promise<TierConfig | null> {
  const configs = await getAllTierConfigs()
  return configs.find(c => c.key === key) || null
}

/**
 * 获取配额配置（优先数据库，fallback 硬编码）
 */
export async function getQuotaConfig(tier: UserTier): Promise<QuotaLimits> {
  const dbConfig = await getTierConfig(tier)
  const fallback = QUOTA_CONFIG[tier]
  if (dbConfig?.quotaConfig) {
    // DB 配置与代码默认值合并：DB 中缺少的字段 fallback 到代码默认值
    return { ...fallback, ...dbConfig.quotaConfig }
  }
  return fallback
}

/**
 * 获取等级显示名称（优先数据库，fallback 硬编码）
 */
export async function getTierDisplayName(tier: UserTier): Promise<{ nameZh: string; nameEn: string }> {
  const dbConfig = await getTierConfig(tier)
  if (dbConfig) {
    return { nameZh: dbConfig.nameZh, nameEn: dbConfig.nameEn }
  }
  return TIER_DISPLAY_NAMES[tier]
}

/**
 * 获取等级定价（优先数据库，fallback 硬编码）
 */
export async function getTierPricing(tier: Exclude<UserTier, 'medium'>): Promise<PlanPricing> {
  const dbConfig = await getTierConfig(tier)
  if (dbConfig?.pricingConfig) {
    return dbConfig.pricingConfig
  }
  return PRICING_CONFIG[tier]
}

/**
 * 清除内存缓存（管理后台修改配置后调用）
 */
export function clearTierConfigCache() {
  cache = null
  cacheTime = 0
}

/**
 * 创建等级配置
 */
export async function createTierConfig(data: {
  key: string
  nameZh: string
  nameEn: string
  description?: string
  sortOrder?: number
  isActive?: boolean
  quotaConfig: QuotaLimits
  pricingConfig?: PlanPricing | null
  benefits?: string[]
}): Promise<TierConfig> {
  const existing = await prisma.tierConfig.findUnique({ where: { key: data.key } })
  if (existing) {
    throw new Error('TIER_KEY_EXISTS')
  }

  const row = await prisma.tierConfig.create({
    data: {
      key: data.key,
      nameZh: data.nameZh,
      nameEn: data.nameEn,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      quotaConfig: data.quotaConfig as any,
      pricingConfig: data.pricingConfig ? (data.pricingConfig as any) : null,
      benefits: data.benefits || [],
    },
  })

  clearTierConfigCache()
  return rowToTierConfig(row)
}

/**
 * 更新等级配置
 */
export async function updateTierConfig(
  id: string,
  data: Partial<{
    nameZh: string
    nameEn: string
    description: string | null
    sortOrder: number
    isActive: boolean
    quotaConfig: QuotaLimits
    pricingConfig: PlanPricing | null
    benefits: string[]
  }>
): Promise<TierConfig> {
  const updateData: Record<string, unknown> = {}
  if (data.nameZh !== undefined) updateData.nameZh = data.nameZh
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn
  if (data.description !== undefined) updateData.description = data.description
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.quotaConfig !== undefined) updateData.quotaConfig = data.quotaConfig
  if (data.pricingConfig !== undefined) updateData.pricingConfig = data.pricingConfig
  if (data.benefits !== undefined) updateData.benefits = data.benefits

  const row = await prisma.tierConfig.update({
    where: { id },
    data: updateData,
  })

  clearTierConfigCache()
  return rowToTierConfig(row)
}

/**
 * 删除等级配置
 */
export async function deleteTierConfig(id: string): Promise<void> {
  await prisma.tierConfig.delete({ where: { id } })
  clearTierConfigCache()
}
