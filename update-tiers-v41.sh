#!/bin/bash
cd /opt/linkchest/api/project/apps/api
cat > /opt/linkchest/api/project/apps/api/update-tiers-v41.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// v4.1: 仅年付 ¥98，删除未实现功能字段
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
      dailyImportLimit: 30, metadataDailyLimit: 30, trashRetentionDays: 7,
      sharePassword: false, shareExpiry: false, shareRating: false,
    },
    pricingConfig: null,  // 免费版无价格
    benefits: ['基础收藏与分类', '基础分享', '社区支持'],
  },
  {
    key: 'heavy',
    nameZh: '专业版',
    nameEn: 'Pro',
    description: '解锁全部功能,适合重度用户',
    sortOrder: 1,
    isActive: true,
    quotaConfig: {
      collections: 999999, tags: 999999, lists: 999999,
      shares: 100, shareItems: 999999, coverImages: 999999,
      coverImagesDaily: 80, maxItemsPerShare: 500,
      dailyImportLimit: 500, metadataDailyLimit: 200, trashRetentionDays: 30,
      sharePassword: true, shareExpiry: true, shareRating: true,
    },
    // v4.1: 仅年付 ¥98 (国内 9800 分, 海外 $14.99 = 1499 美分)
    pricingConfig: { yearly: { usd: 1499, cny: 9800 } },
    benefits: ['分享密码保护', '分享有效期设置', '分享评分', '支付宝年付'],
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
    },
    pricingConfig: { yearly: { usd: 2999, cny: 19900 } },
    benefits: ['专业版所有功能'],
  },
];

(async () => {
  for (const t of NEW_TIERS) {
    try {
      const existing = await p.tierConfig.findUnique({ where: { key: t.key } });
      // 清理掉未实现的字段（即使 DB 之前存了）
      const cleanQuota: any = { ...t.quotaConfig };
      delete cleanQuota.shareStats;
      delete cleanQuota.shareViews;
      delete cleanQuota.customShareCover;
      delete cleanQuota.shareLayout;
      delete cleanQuota.batchOps;
      delete cleanQuota.exportPdf;
      delete cleanQuota.prioritySupport;
      delete cleanQuota.earlyAccess;

      // 清理掉 pricingConfig 中的 monthly
      const cleanPricing: any = t.pricingConfig ? { ...t.pricingConfig } : null;
      if (cleanPricing) delete cleanPricing.monthly;

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
        console.log(`  ✓ Updated ${t.key}: ${t.nameZh} / ${t.nameEn} (yearly: ${cleanPricing?.yearly?.cny ? `¥${cleanPricing.yearly.cny/100}` : 'free'})`);
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
npx tsx update-tiers-v41.ts 2>&1
rm -f update-tiers-v41.ts
