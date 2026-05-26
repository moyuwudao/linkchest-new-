const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.collection.findMany({
  where: { OR: [{ platform: 'douyin' }, { url: { contains: 'douyin' } }] },
  take: 5,
  select: { url: true, title: true, coverImage: true, platform: true }
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
}).catch(e => { console.log('ERROR:', e.message); p.$disconnect(); });
