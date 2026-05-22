import { QUOTA_CONFIG, TIER_DISPLAY_NAMES } from '../lib/config'
import { QuotaErrorCodes } from '../lib/errorCodes'

describe('Quota Config', () => {
  it('has three tiers defined', () => {
    expect(Object.keys(QUOTA_CONFIG)).toEqual(['medium', 'heavy', 'super'])
  })

  it('medium tier has correct v3.0 limits', () => {
    expect(QUOTA_CONFIG.medium).toMatchObject({
      collections: 999999,
      tags: 999999,
      lists: 999999,
      shares: 10,
      coverImages: 999999,
      coverImagesDaily: 5,
      maxItemsPerShare: 100,
      dailyImportLimit: 200,
      metadataDailyLimit: 30,
      trashRetentionDays: 7,
    })
  })

  it('heavy tier has higher server-cost limits than medium', () => {
    // v3.0: collections/tags/lists 为功能性无限（999999），分级维度聚焦分享/导入/封面/元数据
    expect(QUOTA_CONFIG.heavy.shares).toBeGreaterThan(QUOTA_CONFIG.medium.shares)
    expect(QUOTA_CONFIG.heavy.coverImagesDaily).toBeGreaterThan(QUOTA_CONFIG.medium.coverImagesDaily)
    expect(QUOTA_CONFIG.heavy.maxItemsPerShare).toBeGreaterThan(QUOTA_CONFIG.medium.maxItemsPerShare)
    expect(QUOTA_CONFIG.heavy.dailyImportLimit).toBeGreaterThan(QUOTA_CONFIG.medium.dailyImportLimit)
    expect(QUOTA_CONFIG.heavy.metadataDailyLimit).toBeGreaterThan(QUOTA_CONFIG.medium.metadataDailyLimit)
    expect(QUOTA_CONFIG.heavy.trashRetentionDays).toBeGreaterThan(QUOTA_CONFIG.medium.trashRetentionDays)
  })

  it('super tier has higher server-cost limits than heavy', () => {
    expect(QUOTA_CONFIG.super.shares).toBeGreaterThan(QUOTA_CONFIG.heavy.shares)
    expect(QUOTA_CONFIG.super.coverImagesDaily).toBeGreaterThan(QUOTA_CONFIG.heavy.coverImagesDaily)
    expect(QUOTA_CONFIG.super.maxItemsPerShare).toBeGreaterThan(QUOTA_CONFIG.heavy.maxItemsPerShare)
    expect(QUOTA_CONFIG.super.dailyImportLimit).toBeGreaterThan(QUOTA_CONFIG.heavy.dailyImportLimit)
    expect(QUOTA_CONFIG.super.metadataDailyLimit).toBeGreaterThan(QUOTA_CONFIG.heavy.metadataDailyLimit)
    expect(QUOTA_CONFIG.super.trashRetentionDays).toBeGreaterThan(QUOTA_CONFIG.heavy.trashRetentionDays)
  })

  it('tier display names have zh and en', () => {
    expect(TIER_DISPLAY_NAMES.medium).toHaveProperty('nameZh')
    expect(TIER_DISPLAY_NAMES.medium).toHaveProperty('nameEn')
  })
})

describe('Quota Error Codes', () => {
  it('contains expected error codes', () => {
    expect(QuotaErrorCodes.QUOTA_COLLECTIONS_EXCEEDED).toBeDefined()
    expect(QuotaErrorCodes.QUOTA_TAGS_EXCEEDED).toBeDefined()
    expect(QuotaErrorCodes.QUOTA_LISTS_EXCEEDED).toBeDefined()
    expect(QuotaErrorCodes.QUOTA_SHARES_EXCEEDED).toBeDefined()
    expect(QuotaErrorCodes.QUOTA_SHARE_ITEMS_EXCEEDED).toBeDefined()
    expect(QuotaErrorCodes.QUOTA_COVER_IMAGES_EXCEEDED).toBeDefined()
  })
})
