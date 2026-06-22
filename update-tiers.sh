#!/bin/bash
echo "=== 更新数据库 tier 配置 (v4.0 - 2 档套餐) ==="
cd /opt/linkchest/api/project/apps/api
cat > /opt/linkchest/api/project/apps/api/update-tiers.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// v4.0 配置
const NEW_TIERS = [
  {
    key: 'medium',
    nameZh: '免费版',
    nameEn: 'Free',
    description: '适合轻度使用',
    sortOrder: 0,
    isActive: true,
    quotaConfig: {
      collections: 999999,
      tags: 999999,
      lists: 999999,
      shares: 5,
      shareItems: 999999,
      coverImages: 999999,
      coverImagesDaily: 5,
      maxItemsPerShare: 50,
      dailyImportLimit: 30,
      metadataDailyLimit: 30,
      trashRetentionDays: 7,
      sharePassword: false,
      shareStats: false,
      shareExpiry: false,
      shareRating: false,
      customShareCover: false,
      shareLayout: false,
      batchOps: false,
      exportPdf: false,
      prioritySupport: false,
      earlyAccess: false,
    },
    pricingConfig: null,
    benefits: ['无限收藏、标签、分组', '批量操作（全员开放）', '导出 HTML + CSV'],
  },
  {
    key: 'heavy',
    nameZh: '专业版',
    nameEn: 'Pro',
    description: '解锁全部功能，覆盖 95% 重度用户',
    sortOrder: 1,
    isActive: true,
    quotaConfig: {
      collections: 999999,
      tags: 999999,
      lists: 999999,
      shares: 100,
      shareItems: 999999,
      coverImages: 999999,
      coverImagesDaily: 80,
      maxItemsPerShare: 500,
      dailyImportLimit: 500,
      metadataDailyLimit: 200,
      trashRetentionDays: 30,
      sharePassword: true,
      shareStats: true,
      shareExpiry: true,
      shareRating: true,
      customShareCover: true,
      shareLayout: true,
      batchOps: true,
      exportPdf: true,
      prioritySupport: true,
      earlyAccess: true,
    },
    pricingConfig: {
      monthly: { usd: 299, cny: 1990 },   // ¥19.9/月
      yearly: { usd: 2871, cny: 19900 },   // ¥199/年
    },
    benefits: ['分享密码保护', '分享访问统计', '分享过期/评分', '自定义分享封面', '批量操作', '导出 PDF', '优先技术支持', '新功能优先体验'],
  },
  {
    key: 'super',
    nameZh: '企业版',
    nameEn: 'Enterprise',
    description: '保留内部数据,UI 隐藏,未来扩展用',
    sortOrder: 2,
    isActive: true,  // 数据库保留激活,UI 隐藏
    quotaConfig: {
      collections: 999999,
      tags: 999999,
      lists: 999999,
      shares: 300,
      shareItems: 999999,
      coverImages: 999999,
      coverImagesDaily: 100,
      maxItemsPerShare: 1000,
      dailyImportLimit: 5000,
      metadataDailyLimit: 500,
      trashRetentionDays: 90,
      sharePassword: true,
      shareStats: true,
      shareExpiry: true,
      shareRating: true,
      customShareCover: true,
      shareLayout: true,
      batchOps: true,
      exportPdf: true,
      prioritySupport: true,
      earlyAccess: true,
    },
    pricingConfig: {
      monthly: { usd: 599, cny: 3990 },
      yearly: { usd: 5751, cny: 39900 },
    },
    benefits: ['专业版所有功能'],
  },
];

(async () => {
  for (const t of NEW_TIERS) {
    try {
      const existing = await p.tierConfig.findUnique({ where: { key: t.key } });
      if (existing) {
        await p.tierConfig.update({
          where: { key: t.key },
          data: {
            nameZh: t.nameZh,
            nameEn: t.nameEn,
            description: t.description,
            sortOrder: t.sortOrder,
            isActive: t.isActive,
            quotaConfig: t.quotaConfig as any,
            pricingConfig: t.pricingConfig as any,
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
            quotaConfig: t.quotaConfig as any,
            pricingConfig: t.pricingConfig as any,
            benefits: t.benefits,
          },
        });
        console.log(`  ✓ Created ${t.key}: ${t.nameZh} / ${t.nameEn}`);
      }
    } catch (err: any) {
      console.error(`  ✗ Failed ${t.key}:`, err.message);
    }
  }
  await p.$disconnect();
  console.log('Done!');
})();
EOF
npx tsx update-tiers.ts 2>&1
rm -f update-tiers.ts
