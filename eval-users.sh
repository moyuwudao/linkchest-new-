#!/bin/bash
echo "=== Prisma 统计 ==="
cd /opt/linkchest/api/project/apps/api
cat > /opt/linkchest/api/project/apps/api/eval-tmp.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const total = await p.user.count();
  console.log('  users total:', total);
  const active7d = await p.user.count({ where: { collections: { some: { createdAt: { gt: new Date(Date.now() - 7*86400000) } } } } });
  console.log('  active 7d:', active7d);
  const active30d = await p.user.count({ where: { collections: { some: { createdAt: { gt: new Date(Date.now() - 30*86400000) } } } } });
  console.log('  active 30d:', active30d);
  const colToday = await p.collection.count({ where: { createdAt: { gt: new Date(Date.now() - 86400000) } } });
  console.log('  collections today:', colToday);
  const colTotal = await p.collection.count();
  console.log('  collections total:', colTotal);
  const tierStats = await p.user.groupBy({ by: ['tier'], _count: { _all: true } });
  console.log('  tier distribution:', JSON.stringify(tierStats, null, 2));
  const colWithCover = await p.collection.count({ where: { cover: { not: null } } });
  console.log('  collections with cover:', colWithCover);
  const colNoCover = colTotal - colWithCover;
  console.log('  collections without cover:', colNoCover);
  // 过去 7 天每天的新增收藏
  const last7 = await p.$queryRaw`SELECT DATE_TRUNC('day', "createdAt") as d, COUNT(*) as cnt FROM "Collection" WHERE "createdAt" > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1`;
  console.log('  7 days collection create:', JSON.stringify(last7));
  // 过去 7 天每天的封面接入
  const coverStats = await p.$queryRaw`SELECT DATE_TRUNC('day', "createdAt") as d, COUNT(*) as cnt FROM "Collection" WHERE "cover" IS NOT NULL AND "createdAt" > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1`;
  console.log('  7 days cover create:', JSON.stringify(coverStats));
  await p.$disconnect();
})();
EOF
npx tsx eval-tmp.ts 2>&1
rm -f eval-tmp.ts
