#!/bin/bash
cd /opt/linkchest/api/project/apps/api
cat > /opt/linkchest/api/project/apps/api/update-tiers-v42.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// v4.2: 国内版套餐优化
// 1. 专业版→进阶版
// 2. 分享功能统一为"分享增强"（分享密码保护+分享有效期设置+分享评分）
// 3. 新增重复检测、自动备份功能开关
// 4. 单次分享容量: 免费版50→200(进阶版)
// 5. 新建收藏自动抓取封面: 免费版30→15, 进阶版500→100
const NEW_TIERS = [
  {
    key: 'medium',
    nameZh: '免费版',
    nameEn: 'Free',
    description: '适合日常使用',
    sortOrder: 0,
    isActive: true,
    quotaConfig: {
      collections: 999999, tags: 999999, lists: 999999,
      shares: 5, shareItems: 999999, coverImages: 999999,
      coverImagesDaily: 5, maxItemsPerShare: 50,
      dailyImportLimit: 15, metadataDailyLimit: 30, trashRetentionDays: 7,
      sharePassword: false, shareExpiry: false, shareRating: false,
      duplicateCheck: false, autoBackup: false,
    },
    pricingConfig: null,
    benefits: ['基础收藏与分类', '基础分享', '社区支持'],
  },
  {
    key: 'heavy',
    nameZh: '进阶版',
    nameEn: 'Pro',
    description: '解锁全部功能,适合重度用户',
    sortOrder: 1,
    isActive: true,
    quotaConfig: {
      collections: 999999, tags: 999999, lists: 999999,
      shares: 100, shareItems: 999999, coverImages: 999999,
      coverImagesDaily: 80, maxItemsPerShare: 200,
      dailyImportLimit: 100, metadataDailyLimit: 200, trashRetentionDays: 30,
      sharePassword: true, shareExpiry: true, shareRating: true,
      duplicateCheck: true, autoBackup: true,
    },
    pricingConfig: { monthly: { usd: 149, cny: 980 }, yearly: { usd: 1499, cny: 9800 } },
    benefits: ['分享增强', '重复检测', '自动备份', '支付宝月付/年付'],
  },
  {
    key: 'super',
    nameZh: '企业版',
    nameEn: 'Enterprise',
    description: '保留内部数据,UI 隐藏,未来扩展用',
    sortOrder: 2,
    isActive: true,
    quotaConfig: {
      collections: 999999, tags: 999999, lists: 999999,
      shares: 300, shareItems: 999999, coverImages: 999999,
      coverImagesDaily: 100, maxItemsPerShare: 1000,
      dailyImportLimit: 5000, metadataDailyLimit: 500, trashRetentionDays: 90,
      sharePassword: true, shareExpiry: true, shareRating: true,
      duplicateCheck: true, autoBackup: true,
    },
    pricingConfig: { monthly: { usd: 287, cny: 1990 }, yearly: { usd: 2999, cny: 19900 } },
    benefits: ['进阶版所有功能'],
  },
];

(async () => {
  for (const t of NEW_TIERS) {
    try {
      const existing = await p.tierConfig.findUnique({ where: { key: t.key } });
      const cleanQuota: any = { ...t.quotaConfig };
      delete cleanQuota.shareStats;
      delete cleanQuota.shareViews;
      delete cleanQuota.customShareCover;
      delete cleanQuota.shareLayout;
      delete cleanQuota.batchOps;
      delete cleanQuota.exportPdf;
      delete cleanQuota.prioritySupport;
      delete cleanQuota.earlyAccess;

      const cleanPricing: any = t.pricingConfig ? { ...t.pricingConfig } : null;
      // v4.2: 保留 monthly 字段

      if (existing) {
        await p.tierConfig.update({
          where: { key: t.key },
          data: {
            nameZh: t.nameZh,
            nameEn: t.nameEn,
            description: t.description,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            quotaConfig: cleanQuota,
            pricingConfig: cleanPricing as any,
            benefits: t.benefits,
          },
        });
        console.log(`  ✓ Updated ${t.key}: ${t.nameZh} / ${t.nameEn}`);
      } else {
        await p.tierConfig.create({
          data: {
            key: t.key,
            nameZh: t.nameZh,
            nameEn: t.nameEn,
            description: t.description,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            quotaConfig: cleanQuota,
            pricingConfig: cleanPricing as any,
            benefits: t.benefits,
          },
        });
        console.log(`  ✓ Created ${t.key}: ${t.nameZh}`);
      }
    } catch (err: any) {
      console.error(`  ✗ Failed ${t.key}:`, err.message);
    }
  }
  await p.$disconnect();
  console.log('Done!');
})();
EOF
npx tsx update-tiers-v42.ts 2>&1
rm -f update-tiers-v42.ts
